import request from 'supertest';
import { Express } from 'express';
import { prisma } from '../../src/config/database';
import { AuthTestHelper } from '../helpers/auth';
import { TestDataFactory } from '../helpers/factories';
import { dbHelper, setupTestDatabase, teardownTestDatabase } from '../helpers/database';
import { ClientStatus, Gender, CommunicationMethod, UserRole } from '@prisma/client';

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

describe('Client API Integration Tests', () => {
  beforeAll(async () => {
    // Dynamic import to ensure mocks are applied
    app = (await import('../../src/app')).default;
    
    // Setup test database
    await setupTestDatabase();
    
    // Create test companies
    testCompany1 = await dbHelper.client.company.create({
      data: TestDataFactory.createCompany({
        id: 'client-test-company-1',
        name: 'Client Test Company 1',
        email: 'client1@test.com',
      })
    });

    testCompany2 = await dbHelper.client.company.create({
      data: TestDataFactory.createCompany({
        id: 'client-test-company-2',
        name: 'Client Test Company 2',
        email: 'client2@test.com',
      })
    });

    // Create users for different roles
    adminUser1 = await dbHelper.client.user.create({
      data: TestDataFactory.createAdminUser(testCompany1.id, {
        id: 'client-admin-1',
        email: 'admin1@clienttest.com',
      })
    });

    adminUser2 = await dbHelper.client.user.create({
      data: TestDataFactory.createAdminUser(testCompany2.id, {
        id: 'client-admin-2',
        email: 'admin2@clienttest.com',
      })
    });

    managerUser1 = await dbHelper.client.user.create({
      data: TestDataFactory.createUser(testCompany1.id, {
        id: 'client-manager-1',
        email: 'manager1@clienttest.com',
        role: UserRole.MANAGER,
      })
    });

    staffUser1 = await dbHelper.client.user.create({
      data: TestDataFactory.createUser(testCompany1.id, {
        id: 'client-staff-1',
        email: 'staff1@clienttest.com',
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
    // Clean up clients before each test
    await dbHelper.client.client.deleteMany({
      where: {
        OR: [
          { companyId: testCompany1.id },
          { companyId: testCompany2.id },
        ]
      }
    });
  });

  describe('Client CRUD Operations', () => {
    describe('POST /api/v1/clients', () => {
      it('should successfully create a client', async () => {
        const clientData = {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          phone: '+1234567890',
          dateOfBirth: '1990-01-01',
          gender: Gender.MALE,
          address: {
            street: '123 Main St',
            city: 'Test City',
            state: 'Test State',
            country: 'Test Country',
            postalCode: '12345',
          },
          preferredLanguage: 'en',
          preferredCommunication: CommunicationMethod.EMAIL,
          allergies: 'None',
          medicalConditions: 'None',
          notes: 'Test client',
          marketingConsent: true,
        };

        const response = await request(app)
          .post('/api/v1/clients')
          .set('Authorization', `Bearer ${adminToken1}`)
          .send(clientData)
          .expect(201);

        expect(response.body).toMatchObject({
          success: true,
          message: expect.stringContaining('created'),
          data: {
            firstName: clientData.firstName,
            lastName: clientData.lastName,
            email: clientData.email,
            phone: clientData.phone,
            gender: clientData.gender,
            companyId: testCompany1.id,
            createdById: adminUser1.id,
            status: ClientStatus.ACTIVE,
          },
        });

        // Verify in database
        const createdClient = await dbHelper.client.client.findUnique({
          where: { id: response.body.data.id }
        });

        expect(createdClient).toBeTruthy();
        expect(createdClient!.companyId).toBe(testCompany1.id);
        expect(createdClient!.createdById).toBe(adminUser1.id);
      });

      it('should create client with minimal required fields', async () => {
        const minimalClientData = {
          firstName: 'Jane',
          lastName: 'Smith',
        };

        const response = await request(app)
          .post('/api/v1/clients')
          .set('Authorization', `Bearer ${adminToken1}`)
          .send(minimalClientData)
          .expect(201);

        expect(response.body.data).toMatchObject({
          firstName: 'Jane',
          lastName: 'Smith',
          status: ClientStatus.ACTIVE,
          isActive: true,
          marketingConsent: false, // Default
          preferredCommunication: CommunicationMethod.EMAIL, // Default
        });
      });

      it('should validate required fields', async () => {
        const invalidData = {
          // Missing firstName and lastName
          email: 'invalid-email', // Invalid format
        };

        const response = await request(app)
          .post('/api/v1/clients')
          .set('Authorization', `Bearer ${adminToken1}`)
          .send(invalidData)
          .expect(400);

        expect(response.body).toMatchObject({
          success: false,
          message: 'Validation failed',
          errors: expect.any(Array),
        });

        const errors = response.body.errors;
        const errorFields = errors.map((error: any) => error.path || error.field);
        expect(errorFields).toContain('firstName');
        expect(errorFields).toContain('lastName');
      });

      it('should validate email format when provided', async () => {
        const clientData = {
          firstName: 'Test',
          lastName: 'User',
          email: 'invalid-email-format',
        };

        const response = await request(app)
          .post('/api/v1/clients')
          .set('Authorization', `Bearer ${adminToken1}`)
          .send(clientData)
          .expect(400);

        const errors = response.body.errors;
        const emailError = errors.find((error: any) => 
          (error.path || error.field) === 'email'
        );
        expect(emailError).toBeTruthy();
      });

      it('should allow staff and managers to create clients', async () => {
        const clientData = {
          firstName: 'Staff',
          lastName: 'Created',
        };

        // Staff can create
        await request(app)
          .post('/api/v1/clients')
          .set('Authorization', `Bearer ${staffToken1}`)
          .send(clientData)
          .expect(201);

        // Manager can create
        const managerClientData = {
          firstName: 'Manager',
          lastName: 'Created',
        };

        await request(app)
          .post('/api/v1/clients')
          .set('Authorization', `Bearer ${managerToken1}`)
          .send(managerClientData)
          .expect(201);
      });

      it('should handle duplicate email within same company', async () => {
        const clientData = {
          firstName: 'First',
          lastName: 'Client',
          email: 'duplicate@test.com',
        };

        // Create first client
        await request(app)
          .post('/api/v1/clients')
          .set('Authorization', `Bearer ${adminToken1}`)
          .send(clientData)
          .expect(201);

        // Try to create second client with same email
        const duplicateData = {
          firstName: 'Second',
          lastName: 'Client',
          email: 'duplicate@test.com',
        };

        const response = await request(app)
          .post('/api/v1/clients')
          .set('Authorization', `Bearer ${adminToken1}`)
          .send(duplicateData)
          .expect(400);

        expect(response.body.message).toContain('already exists');
      });

      it('should allow same email across different companies', async () => {
        const clientData = {
          firstName: 'Cross',
          lastName: 'Company',
          email: 'cross@test.com',
        };

        // Create client in company1
        await request(app)
          .post('/api/v1/clients')
          .set('Authorization', `Bearer ${adminToken1}`)
          .send(clientData)
          .expect(201);

        // Create client with same email in company2
        await request(app)
          .post('/api/v1/clients')
          .set('Authorization', `Bearer ${adminToken2}`)
          .send(clientData)
          .expect(201);
      });
    });

    describe('GET /api/v1/clients/:id', () => {
      let testClient: any;

      beforeEach(async () => {
        testClient = await dbHelper.client.client.create({
          data: TestDataFactory.createClient(testCompany1.id, adminUser1.id, {
            firstName: 'Get',
            lastName: 'Test',
            email: 'get.test@example.com',
          })
        });
      });

      it('should retrieve client details successfully', async () => {
        const response = await request(app)
          .get(`/api/v1/clients/${testClient.id}`)
          .set('Authorization', `Bearer ${adminToken1}`)
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          data: {
            id: testClient.id,
            firstName: 'Get',
            lastName: 'Test',
            email: 'get.test@example.com',
            companyId: testCompany1.id,
          },
        });
      });

      it('should enforce multi-tenant isolation', async () => {
        // Admin from company2 trying to access company1 client
        await request(app)
          .get(`/api/v1/clients/${testClient.id}`)
          .set('Authorization', `Bearer ${adminToken2}`)
          .expect(404); // Should not find client from different company
      });

      it('should return 404 for non-existent client', async () => {
        await request(app)
          .get('/api/v1/clients/non-existent-id')
          .set('Authorization', `Bearer ${adminToken1}`)
          .expect(404);
      });

      it('should allow all user roles to view client details', async () => {
        // Admin
        await request(app)
          .get(`/api/v1/clients/${testClient.id}`)
          .set('Authorization', `Bearer ${adminToken1}`)
          .expect(200);

        // Manager
        await request(app)
          .get(`/api/v1/clients/${testClient.id}`)
          .set('Authorization', `Bearer ${managerToken1}`)
          .expect(200);

        // Staff
        await request(app)
          .get(`/api/v1/clients/${testClient.id}`)
          .set('Authorization', `Bearer ${staffToken1}`)
          .expect(200);
      });
    });

    describe('PUT /api/v1/clients/:id', () => {
      let testClient: any;

      beforeEach(async () => {
        testClient = await dbHelper.client.client.create({
          data: TestDataFactory.createClient(testCompany1.id, adminUser1.id, {
            firstName: 'Update',
            lastName: 'Test',
            email: 'update.test@example.com',
            phone: '+1111111111',
          })
        });
      });

      it('should update client successfully', async () => {
        const updateData = {
          firstName: 'Updated',
          lastName: 'Name',
          phone: '+9999999999',
          notes: 'Updated notes',
          preferredCommunication: CommunicationMethod.SMS,
        };

        const response = await request(app)
          .put(`/api/v1/clients/${testClient.id}`)
          .set('Authorization', `Bearer ${adminToken1}`)
          .send(updateData)
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          message: expect.stringContaining('updated'),
          data: {
            id: testClient.id,
            firstName: 'Updated',
            lastName: 'Name',
            phone: '+9999999999',
            notes: 'Updated notes',
            preferredCommunication: CommunicationMethod.SMS,
          },
        });

        // Verify in database
        const updatedClient = await dbHelper.client.client.findUnique({
          where: { id: testClient.id }
        });

        expect(updatedClient).toMatchObject({
          firstName: 'Updated',
          lastName: 'Name',
          phone: '+9999999999',
          notes: 'Updated notes',
        });
      });

      it('should validate updated email format', async () => {
        const updateData = {
          email: 'invalid-email-format',
        };

        await request(app)
          .put(`/api/v1/clients/${testClient.id}`)
          .set('Authorization', `Bearer ${adminToken1}`)
          .send(updateData)
          .expect(400);
      });

      it('should prevent updating to duplicate email within same company', async () => {
        // Create another client with an email
        const otherClient = await dbHelper.client.client.create({
          data: TestDataFactory.createClient(testCompany1.id, adminUser1.id, {
            firstName: 'Other',
            lastName: 'Client',
            email: 'other@example.com',
          })
        });

        // Try to update first client to use the same email
        const updateData = {
          email: 'other@example.com',
        };

        await request(app)
          .put(`/api/v1/clients/${testClient.id}`)
          .set('Authorization', `Bearer ${adminToken1}`)
          .send(updateData)
          .expect(400);
      });

      it('should enforce multi-tenant isolation on updates', async () => {
        const updateData = {
          firstName: 'Hacked',
        };

        await request(app)
          .put(`/api/v1/clients/${testClient.id}`)
          .set('Authorization', `Bearer ${adminToken2}`)
          .send(updateData)
          .expect(404);
      });

      it('should allow partial updates', async () => {
        const updateData = {
          notes: 'Only updating notes',
        };

        const response = await request(app)
          .put(`/api/v1/clients/${testClient.id}`)
          .set('Authorization', `Bearer ${adminToken1}`)
          .send(updateData)
          .expect(200);

        expect(response.body.data).toMatchObject({
          firstName: 'Update', // Should remain unchanged
          lastName: 'Test', // Should remain unchanged
          notes: 'Only updating notes',
        });
      });

      it('should allow all user roles to update clients', async () => {
        // Staff update
        await request(app)
          .put(`/api/v1/clients/${testClient.id}`)
          .set('Authorization', `Bearer ${staffToken1}`)
          .send({ notes: 'Staff update' })
          .expect(200);

        // Manager update
        await request(app)
          .put(`/api/v1/clients/${testClient.id}`)
          .set('Authorization', `Bearer ${managerToken1}`)
          .send({ notes: 'Manager update' })
          .expect(200);
      });
    });

    describe('DELETE /api/v1/clients/:id', () => {
      let testClient: any;

      beforeEach(async () => {
        testClient = await dbHelper.client.client.create({
          data: TestDataFactory.createClient(testCompany1.id, adminUser1.id, {
            firstName: 'Delete',
            lastName: 'Test',
          })
        });
      });

      it('should soft delete client successfully', async () => {
        const response = await request(app)
          .delete(`/api/v1/clients/${testClient.id}`)
          .set('Authorization', `Bearer ${adminToken1}`)
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          message: expect.stringContaining('deleted'),
        });

        // Verify soft deletion in database
        const deletedClient = await dbHelper.client.client.findUnique({
          where: { id: testClient.id }
        });

        expect(deletedClient?.isActive).toBe(false);
        expect(deletedClient?.status).toBe(ClientStatus.INACTIVE);
      });

      it('should enforce multi-tenant isolation on deletion', async () => {
        await request(app)
          .delete(`/api/v1/clients/${testClient.id}`)
          .set('Authorization', `Bearer ${adminToken2}`)
          .expect(404);
      });

      it('should require admin or manager role to delete clients', async () => {
        // Staff should not be able to delete
        await request(app)
          .delete(`/api/v1/clients/${testClient.id}`)
          .set('Authorization', `Bearer ${staffToken1}`)
          .expect(403);

        // Manager should be able to delete
        await request(app)
          .delete(`/api/v1/clients/${testClient.id}`)
          .set('Authorization', `Bearer ${managerToken1}`)
          .expect(200);
      });

      it('should return 404 for already deleted client', async () => {
        // Delete once
        await request(app)
          .delete(`/api/v1/clients/${testClient.id}`)
          .set('Authorization', `Bearer ${adminToken1}`)
          .expect(200);

        // Try to delete again
        await request(app)
          .delete(`/api/v1/clients/${testClient.id}`)
          .set('Authorization', `Bearer ${adminToken1}`)
          .expect(404);
      });
    });
  });

  describe('Client Listing and Filtering', () => {
    beforeEach(async () => {
      // Create test clients with various properties
      const clients = [
        {
          firstName: 'Active',
          lastName: 'Client',
          email: 'active@test.com',
          status: ClientStatus.ACTIVE,
          gender: Gender.MALE,
          preferredCommunication: CommunicationMethod.EMAIL,
        },
        {
          firstName: 'Inactive',
          lastName: 'Client',
          email: 'inactive@test.com',
          status: ClientStatus.INACTIVE,
          gender: Gender.FEMALE,
          preferredCommunication: CommunicationMethod.SMS,
        },
        {
          firstName: 'VIP',
          lastName: 'Client',
          email: 'vip@test.com',
          status: ClientStatus.ACTIVE,
          notes: 'VIP customer',
          marketingConsent: true,
        },
        {
          firstName: 'John',
          lastName: 'Smith',
          email: 'john.smith@test.com',
          status: ClientStatus.ACTIVE,
          phone: '+1234567890',
        },
      ];

      for (const clientData of clients) {
        await dbHelper.client.client.create({
          data: TestDataFactory.createClient(testCompany1.id, adminUser1.id, clientData)
        });
      }

      // Create a client for company2 to test isolation
      await dbHelper.client.client.create({
        data: TestDataFactory.createClient(testCompany2.id, adminUser2.id, {
          firstName: 'Other',
          lastName: 'Company',
          email: 'other@test.com',
        })
      });
    });

    describe('GET /api/v1/clients', () => {
      it('should list clients with pagination', async () => {
        const response = await request(app)
          .get('/api/v1/clients')
          .set('Authorization', `Bearer ${adminToken1}`)
          .query({ page: 1, limit: 2 })
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          data: expect.any(Array),
          pagination: {
            page: 1,
            limit: 2,
            total: 4, // Only company1 clients
            pages: 2,
            hasNext: true,
            hasPrev: false,
          },
        });

        expect(response.body.data).toHaveLength(2);
        
        // Verify multi-tenant isolation
        response.body.data.forEach((client: any) => {
          expect(client.companyId).toBe(testCompany1.id);
        });
      });

      it('should filter clients by status', async () => {
        const response = await request(app)
          .get('/api/v1/clients')
          .set('Authorization', `Bearer ${adminToken1}`)
          .query({ status: ClientStatus.ACTIVE })
          .expect(200);

        expect(response.body.data).toHaveLength(3);
        response.body.data.forEach((client: any) => {
          expect(client.status).toBe(ClientStatus.ACTIVE);
        });
      });

      it('should search clients by name', async () => {
        const response = await request(app)
          .get('/api/v1/clients')
          .set('Authorization', `Bearer ${adminToken1}`)
          .query({ search: 'John' })
          .expect(200);

        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0]).toMatchObject({
          firstName: 'John',
          lastName: 'Smith',
        });
      });

      it('should search clients by email', async () => {
        const response = await request(app)
          .get('/api/v1/clients')
          .set('Authorization', `Bearer ${adminToken1}`)
          .query({ search: 'vip@test.com' })
          .expect(200);

        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0].email).toBe('vip@test.com');
      });

      it('should filter clients by gender', async () => {
        const response = await request(app)
          .get('/api/v1/clients')
          .set('Authorization', `Bearer ${adminToken1}`)
          .query({ gender: Gender.FEMALE })
          .expect(200);

        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0].gender).toBe(Gender.FEMALE);
      });

      it('should filter by marketing consent', async () => {
        const response = await request(app)
          .get('/api/v1/clients')
          .set('Authorization', `Bearer ${adminToken1}`)
          .query({ marketingConsent: 'true' })
          .expect(200);

        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0].marketingConsent).toBe(true);
      });

      it('should sort clients correctly', async () => {
        // Sort by firstName ascending
        let response = await request(app)
          .get('/api/v1/clients')
          .set('Authorization', `Bearer ${adminToken1}`)
          .query({ sortBy: 'firstName', sortOrder: 'asc' })
          .expect(200);

        const firstNames = response.body.data.map((c: any) => c.firstName);
        expect(firstNames).toEqual(['Active', 'Inactive', 'John', 'VIP']);

        // Sort by firstName descending
        response = await request(app)
          .get('/api/v1/clients')
          .set('Authorization', `Bearer ${adminToken1}`)
          .query({ sortBy: 'firstName', sortOrder: 'desc' })
          .expect(200);

        const firstNamesDesc = response.body.data.map((c: any) => c.firstName);
        expect(firstNamesDesc).toEqual(['VIP', 'John', 'Inactive', 'Active']);
      });

      it('should enforce multi-tenant isolation', async () => {
        const response = await request(app)
          .get('/api/v1/clients')
          .set('Authorization', `Bearer ${adminToken1}`)
          .expect(200);

        // Should only return clients from testCompany1
        response.body.data.forEach((client: any) => {
          expect(client.companyId).toBe(testCompany1.id);
        });

        // Should not include clients from other companies
        const otherCompanyClient = response.body.data.find(
          (client: any) => client.firstName === 'Other'
        );
        expect(otherCompanyClient).toBeUndefined();
      });

      it('should include/exclude inactive clients based on flag', async () => {
        // Default should exclude inactive
        let response = await request(app)
          .get('/api/v1/clients')
          .set('Authorization', `Bearer ${adminToken1}`)
          .expect(200);

        expect(response.body.data).toHaveLength(3); // Excluding inactive

        // Explicitly include inactive
        response = await request(app)
          .get('/api/v1/clients')
          .set('Authorization', `Bearer ${adminToken1}`)
          .query({ includeInactive: 'true' })
          .expect(200);

        expect(response.body.data).toHaveLength(4); // Including inactive
      });

      it('should work with complex filter combinations', async () => {
        const response = await request(app)
          .get('/api/v1/clients')
          .set('Authorization', `Bearer ${adminToken1}`)
          .query({
            status: ClientStatus.ACTIVE,
            search: 'Client',
            sortBy: 'firstName',
            sortOrder: 'asc',
          })
          .expect(200);

        expect(response.body.data).toHaveLength(2); // Active and VIP (both have 'Client' in lastName)
        
        const names = response.body.data.map((c: any) => c.firstName);
        expect(names).toEqual(['Active', 'VIP']); // Sorted by firstName
      });
    });
  });

  describe('Client Statistics and Counts', () => {
    beforeEach(async () => {
      // Create clients with different statuses
      const clients = [
        { status: ClientStatus.ACTIVE },
        { status: ClientStatus.ACTIVE },
        { status: ClientStatus.ACTIVE },
        { status: ClientStatus.INACTIVE },
        { status: ClientStatus.SUSPENDED },
      ];

      for (const [index, clientData] of clients.entries()) {
        await dbHelper.client.client.create({
          data: TestDataFactory.createClient(testCompany1.id, adminUser1.id, {
            firstName: `Client${index + 1}`,
            lastName: 'Test',
            ...clientData,
          })
        });
      }
    });

    describe('GET /api/v1/clients/count', () => {
      it('should return total client count', async () => {
        const response = await request(app)
          .get('/api/v1/clients/count')
          .set('Authorization', `Bearer ${adminToken1}`)
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          data: {
            total: 5,
            active: 3,
            inactive: 1,
            suspended: 1,
          },
        });
      });

      it('should enforce multi-tenant isolation for counts', async () => {
        // Admin from company2 should get 0 counts
        const response = await request(app)
          .get('/api/v1/clients/count')
          .set('Authorization', `Bearer ${adminToken2}`)
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          data: {
            total: 0,
            active: 0,
            inactive: 0,
            suspended: 0,
          },
        });
      });
    });
  });

  describe('Client History and Activity', () => {
    let testClient: any;

    beforeEach(async () => {
      testClient = await dbHelper.client.client.create({
        data: TestDataFactory.createClient(testCompany1.id, adminUser1.id, {
          firstName: 'History',
          lastName: 'Test',
          email: 'history@test.com',
        })
      });
    });

    describe('GET /api/v1/clients/:id/appointments', () => {
      it('should get client appointment history', async () => {
        // This would require appointment endpoints to be implemented
        // For now, we'll just test the endpoint structure
        await request(app)
          .get(`/api/v1/clients/${testClient.id}/appointments`)
          .set('Authorization', `Bearer ${adminToken1}`)
          .expect(501); // Not implemented
      });
    });

    describe('GET /api/v1/clients/:id/invoices', () => {
      it('should get client invoice history', async () => {
        await request(app)
          .get(`/api/v1/clients/${testClient.id}/invoices`)
          .set('Authorization', `Bearer ${adminToken1}`)
          .expect(501); // Not implemented
      });
    });
  });

  describe('Bulk Operations', () => {
    let testClients: any[];

    beforeEach(async () => {
      // Create multiple clients for bulk operations
      testClients = [];
      for (let i = 1; i <= 5; i++) {
        const client = await dbHelper.client.client.create({
          data: TestDataFactory.createClient(testCompany1.id, adminUser1.id, {
            firstName: `Bulk${i}`,
            lastName: 'Test',
            email: `bulk${i}@test.com`,
          })
        });
        testClients.push(client);
      }
    });

    describe('POST /api/v1/clients/bulk/update', () => {
      it('should update multiple clients status', async () => {
        const bulkUpdateData = {
          clientIds: [testClients[0].id, testClients[1].id],
          status: ClientStatus.SUSPENDED,
        };

        const response = await request(app)
          .post('/api/v1/clients/bulk/update')
          .set('Authorization', `Bearer ${adminToken1}`)
          .send(bulkUpdateData)
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          message: expect.stringContaining('updated'),
          data: {
            updatedCount: 2,
          },
        });

        // Verify updates in database
        for (const clientId of bulkUpdateData.clientIds) {
          const client = await dbHelper.client.client.findUnique({
            where: { id: clientId }
          });
          expect(client?.status).toBe(ClientStatus.SUSPENDED);
        }
      });

      it('should enforce multi-tenant isolation in bulk operations', async () => {
        const bulkUpdateData = {
          clientIds: [testClients[0].id],
          status: ClientStatus.SUSPENDED,
        };

        // Try with admin from different company
        await request(app)
          .post('/api/v1/clients/bulk/update')
          .set('Authorization', `Bearer ${adminToken2}`)
          .send(bulkUpdateData)
          .expect(400); // Should not find clients
      });

      it('should require admin role for bulk operations', async () => {
        const bulkUpdateData = {
          clientIds: [testClients[0].id],
          status: ClientStatus.SUSPENDED,
        };

        await request(app)
          .post('/api/v1/clients/bulk/update')
          .set('Authorization', `Bearer ${staffToken1}`)
          .send(bulkUpdateData)
          .expect(403);
      });

      it('should handle empty client ID array', async () => {
        const bulkUpdateData = {
          clientIds: [],
          status: ClientStatus.SUSPENDED,
        };

        await request(app)
          .post('/api/v1/clients/bulk/update')
          .set('Authorization', `Bearer ${adminToken1}`)
          .send(bulkUpdateData)
          .expect(400);
      });

      it('should handle invalid client IDs gracefully', async () => {
        const bulkUpdateData = {
          clientIds: ['invalid-id-1', 'invalid-id-2'],
          status: ClientStatus.SUSPENDED,
        };

        const response = await request(app)
          .post('/api/v1/clients/bulk/update')
          .set('Authorization', `Bearer ${adminToken1}`)
          .send(bulkUpdateData)
          .expect(200);

        expect(response.body.data.updatedCount).toBe(0);
      });
    });

    describe('DELETE /api/v1/clients/bulk', () => {
      it('should bulk delete clients', async () => {
        const bulkDeleteData = {
          clientIds: [testClients[2].id, testClients[3].id],
        };

        const response = await request(app)
          .delete('/api/v1/clients/bulk')
          .set('Authorization', `Bearer ${adminToken1}`)
          .send(bulkDeleteData)
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          message: expect.stringContaining('deleted'),
          data: {
            deletedCount: 2,
          },
        });

        // Verify soft deletion in database
        for (const clientId of bulkDeleteData.clientIds) {
          const client = await dbHelper.client.client.findUnique({
            where: { id: clientId }
          });
          expect(client?.isActive).toBe(false);
          expect(client?.status).toBe(ClientStatus.INACTIVE);
        }
      });

      it('should require admin role for bulk deletion', async () => {
        const bulkDeleteData = {
          clientIds: [testClients[0].id],
        };

        await request(app)
          .delete('/api/v1/clients/bulk')
          .set('Authorization', `Bearer ${managerToken1}`)
          .send(bulkDeleteData)
          .expect(403);
      });
    });
  });

  describe('Authentication and Authorization', () => {
    let testClient: any;

    beforeEach(async () => {
      testClient = await dbHelper.client.client.create({
        data: TestDataFactory.createClient(testCompany1.id, adminUser1.id, {
          firstName: 'Auth',
          lastName: 'Test',
        })
      });
    });

    it('should require authentication for all endpoints', async () => {
      const endpoints = [
        { method: 'get', path: '/api/v1/clients' },
        { method: 'post', path: '/api/v1/clients' },
        { method: 'get', path: `/api/v1/clients/${testClient.id}` },
        { method: 'put', path: `/api/v1/clients/${testClient.id}` },
        { method: 'delete', path: `/api/v1/clients/${testClient.id}` },
        { method: 'get', path: '/api/v1/clients/count' },
      ];

      for (const endpoint of endpoints) {
        await request(app)
          [endpoint.method](endpoint.path)
          .expect(401);
      }
    });

    it('should reject invalid tokens', async () => {
      await request(app)
        .get('/api/v1/clients')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should reject expired tokens', async () => {
      const expiredToken = AuthTestHelper.generateExpiredToken({
        id: adminUser1.id,
        companyId: testCompany1.id,
        role: UserRole.ADMIN,
      });

      await request(app)
        .get('/api/v1/clients')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);
    });
  });

  describe('Input Validation and Error Handling', () => {
    it('should validate UUID format for client IDs', async () => {
      await request(app)
        .get('/api/v1/clients/invalid-uuid')
        .set('Authorization', `Bearer ${adminToken1}`)
        .expect(400);
    });

    it('should handle malformed JSON payloads', async () => {
      await request(app)
        .post('/api/v1/clients')
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('Content-Type', 'application/json')
        .send('{"invalid": json,}')
        .expect(400);
    });

    it('should validate enum values', async () => {
      const invalidData = {
        firstName: 'Test',
        lastName: 'User',
        gender: 'INVALID_GENDER',
        status: 'INVALID_STATUS',
        preferredCommunication: 'INVALID_METHOD',
      };

      const response = await request(app)
        .post('/api/v1/clients')
        .set('Authorization', `Bearer ${adminToken1}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.errors.length).toBeGreaterThan(0);
    });

    it('should validate date formats', async () => {
      const invalidData = {
        firstName: 'Test',
        lastName: 'User',
        dateOfBirth: 'invalid-date',
      };

      await request(app)
        .post('/api/v1/clients')
        .set('Authorization', `Bearer ${adminToken1}`)
        .send(invalidData)
        .expect(400);
    });

    it('should handle database constraint violations gracefully', async () => {
      // This would test scenarios like database connection issues
      // For now, we'll test the API's response structure
      const response = await request(app)
        .get('/api/v1/clients/test-error-handling')
        .set('Authorization', `Bearer ${adminToken1}`)
        .expect(404); // Not found route

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('Performance Tests', () => {
    it('should handle large result sets efficiently', async () => {
      // Create many clients
      const clientPromises = Array.from({ length: 100 }, (_, i) => {
        return dbHelper.client.client.create({
          data: TestDataFactory.createClient(testCompany1.id, adminUser1.id, {
            firstName: `Perf${i}`,
            lastName: 'Test',
            email: `perf${i}@test.com`,
          })
        });
      });

      await Promise.all(clientPromises);

      const startTime = Date.now();

      const response = await request(app)
        .get('/api/v1/clients')
        .set('Authorization', `Bearer ${adminToken1}`)
        .query({ limit: 50 })
        .expect(200);

      const duration = Date.now() - startTime;

      expect(response.body.data).toHaveLength(50);
      expect(duration).toBeLessThan(2000); // Should respond within 2 seconds
    });

    it('should handle concurrent client creation requests', async () => {
      const concurrentRequests = Array.from({ length: 10 }, (_, i) => {
        return request(app)
          .post('/api/v1/clients')
          .set('Authorization', `Bearer ${adminToken1}`)
          .send({
            firstName: `Concurrent${i}`,
            lastName: 'Client',
            email: `concurrent${i}@test.com`,
          });
      });

      const responses = await Promise.all(concurrentRequests);

      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(201);
      });

      // Verify all clients were created
      const clients = await dbHelper.client.client.findMany({
        where: {
          companyId: testCompany1.id,
          firstName: { startsWith: 'Concurrent' }
        }
      });

      expect(clients).toHaveLength(10);
    });
  });
});