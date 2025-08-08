import { PrismaClient } from '@prisma/client';
import { prismaMock } from '../setup';

/**
 * Database test utilities for integration tests
 */
export class DatabaseTestHelper {
  private static instance: DatabaseTestHelper;
  private prisma: PrismaClient;

  private constructor() {
    // In test environment, we use the mock
    this.prisma = prismaMock as unknown as PrismaClient;
  }

  static getInstance(): DatabaseTestHelper {
    if (!DatabaseTestHelper.instance) {
      DatabaseTestHelper.instance = new DatabaseTestHelper();
    }
    return DatabaseTestHelper.instance;
  }

  /**
   * Clean up all data (reset mocks in test environment)
   */
  async cleanup(): Promise<void> {
    // Reset all mocks between tests
    jest.clearAllMocks();
  }

  /**
   * Seed test data for integration tests
   */
  async seedTestData(): Promise<{
    company: any;
    users: any[];
    branches: any[];
  }> {
    // In test environment, return mock data
    const mockCompany = {
      id: 'test-company-1',
      name: 'Test Company',
      email: 'test@company.com',
      isActive: true,
      subscriptionStatus: 'ACTIVE' as const,
      subscriptionPlan: 'BASIC' as const,
      billingCycle: 'MONTHLY' as const,
      timezone: 'UTC',
      currency: 'USD',
      dateFormat: 'MM/dd/yyyy',
      timeFormat: '12h',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockUsers = [
      {
        id: 'test-user-1',
        email: 'admin@test.com',
        firstName: 'Admin',
        lastName: 'User',
        companyId: mockCompany.id,
        role: 'ADMIN' as const,
        isActive: true,
        isVerified: true,
        password: '$2a$04$YOhB8F1k0H1A8xhv.XsLVeqVb9lqP5E5P5E5P5E5P5E5P5E5P5E', // 'password123'
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'test-user-2',
        email: 'user@test.com',
        firstName: 'Regular',
        lastName: 'User',
        companyId: mockCompany.id,
        role: 'USER' as const,
        isActive: true,
        isVerified: true,
        password: '$2a$04$YOhB8F1k0H1A8xhv.XsLVeqVb9lqP5E5P5E5P5E5P5E5P5E5P5E', // 'password123'
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const mockBranches = [
      {
        id: 'test-branch-1',
        name: 'Main Branch',
        companyId: mockCompany.id,
        isMain: true,
        isActive: true,
        address: {
          street: '123 Main St',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345',
          country: 'Test Country',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    return {
      company: mockCompany,
      users: mockUsers,
      branches: mockBranches,
    };
  }

  /**
   * Create a test company
   */
  async createTestCompany(overrides: Partial<any> = {}): Promise<any> {
    const defaultCompany = {
      id: `test-company-${Date.now()}`,
      name: 'Test Company',
      email: `test-${Date.now()}@company.com`,
      phone: null,
      website: null,
      address: null,
      logo: null,
      businessType: null,
      taxId: null,
      registrationNumber: null,
      isActive: true,
      subscriptionStatus: 'ACTIVE' as const,
      subscriptionPlan: 'BASIC' as const,
      subscriptionStartDate: null,
      subscriptionEndDate: null,
      billingCycle: 'MONTHLY' as const,
      timezone: 'UTC',
      currency: 'USD',
      dateFormat: 'MM/dd/yyyy',
      timeFormat: '12h',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };

    prismaMock.company.create.mockResolvedValue(defaultCompany as any);
    prismaMock.company.findUnique.mockResolvedValue(defaultCompany as any);
    
    return defaultCompany;
  }

  /**
   * Create a test user
   */
  async createTestUser(companyId: string, overrides: Partial<any> = {}): Promise<any> {
    const defaultUser = {
      id: `test-user-${Date.now()}`,
      email: `test-${Date.now()}@example.com`,
      firstName: 'Test',
      lastName: 'User',
      companyId,
      role: 'USER' as const,
      isActive: true,
      isVerified: true,
      password: '$2a$04$YOhB8F1k0H1A8xhv.XsLVeqVb9lqP5E5P5E5P5E5P5E5P5E5P5E',
      permissions: null,
      phone: null,
      avatar: null,
      lastLoginAt: null,
      resetToken: null,
      resetTokenExpiry: null,
      verificationToken: null,
      verificationTokenExpiry: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };

    prismaMock.user.create.mockResolvedValue(defaultUser);
    prismaMock.user.findUnique.mockResolvedValue(defaultUser);
    prismaMock.user.findFirst.mockResolvedValue(defaultUser);
    
    return defaultUser;
  }

  /**
   * Create a test branch
   */
  async createTestBranch(companyId: string, overrides: Partial<any> = {}): Promise<any> {
    const defaultBranch = {
      id: `test-branch-${Date.now()}`,
      name: 'Test Branch',
      companyId,
      isMain: false,
      isActive: true,
      address: {
        street: '123 Test St',
        city: 'Test City',
        state: 'TS',
        zipCode: '12345',
        country: 'Test Country',
      },
      phone: null,
      email: null,
      operatingHours: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };

    prismaMock.branch.create.mockResolvedValue(defaultBranch);
    prismaMock.branch.findUnique.mockResolvedValue(defaultBranch);
    prismaMock.branch.findFirst.mockResolvedValue(defaultBranch);
    
    return defaultBranch;
  }

  /**
   * Create test staff member
   */
  async createTestStaff(companyId: string, branchId: string, overrides: Partial<any> = {}): Promise<any> {
    const defaultStaff = {
      id: `test-staff-${Date.now()}`,
      companyId,
      branchId,
      firstName: 'Test',
      lastName: 'Staff',
      email: `staff-${Date.now()}@example.com`,
      phone: null,
      avatar: null,
      userId: null,
      employeeId: null,
      position: 'Staff Member',
      department: null,
      hireDate: new Date(),
      specializations: [],
      certifications: null,
      qualifications: null,
      bio: null,
      workSchedule: null,
      availability: null,
      commissionRate: null,
      hourlyRate: null,
      status: 'ACTIVE' as const,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };

    prismaMock.staff.create.mockResolvedValue(defaultStaff);
    prismaMock.staff.findUnique.mockResolvedValue(defaultStaff);
    prismaMock.staff.findFirst.mockResolvedValue(defaultStaff);
    
    return defaultStaff;
  }

  /**
   * Create test client
   */
  async createTestClient(companyId: string, createdById: string, overrides: Partial<any> = {}): Promise<any> {
    const defaultClient = {
      id: `test-client-${Date.now()}`,
      companyId,
      createdById,
      firstName: 'Test',
      lastName: 'Client',
      email: `client-${Date.now()}@example.com`,
      phone: null,
      dateOfBirth: null,
      gender: null,
      address: null,
      preferredLanguage: null,
      preferredCommunication: 'EMAIL' as const,
      allergies: null,
      medicalConditions: null,
      notes: null,
      marketingConsent: false,
      reminderPreferences: null,
      status: 'ACTIVE' as const,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };

    prismaMock.client.create.mockResolvedValue(defaultClient);
    prismaMock.client.findUnique.mockResolvedValue(defaultClient);
    prismaMock.client.findFirst.mockResolvedValue(defaultClient);
    
    return defaultClient;
  }

  /**
   * Setup mock responses for common queries
   */
  setupMockResponses(data: {
    company?: any;
    user?: any;
    users?: any[];
    branch?: any;
    branches?: any[];
    staff?: any;
    client?: any;
  }): void {
    if (data.company) {
      prismaMock.company.findUnique.mockResolvedValue(data.company);
      prismaMock.company.findFirst.mockResolvedValue(data.company);
    }

    if (data.user) {
      prismaMock.user.findUnique.mockResolvedValue(data.user);
      prismaMock.user.findFirst.mockResolvedValue(data.user);
    }

    if (data.users) {
      prismaMock.user.findMany.mockResolvedValue(data.users);
    }

    if (data.branch) {
      prismaMock.branch.findUnique.mockResolvedValue(data.branch);
      prismaMock.branch.findFirst.mockResolvedValue(data.branch);
    }

    if (data.branches) {
      prismaMock.branch.findMany.mockResolvedValue(data.branches);
    }

    if (data.staff) {
      prismaMock.staff.findUnique.mockResolvedValue(data.staff);
      prismaMock.staff.findFirst.mockResolvedValue(data.staff);
    }

    if (data.client) {
      prismaMock.client.findUnique.mockResolvedValue(data.client);
      prismaMock.client.findFirst.mockResolvedValue(data.client);
    }
  }

  /**
   * Get the Prisma instance (mock in test environment)
   */
  getPrisma(): PrismaClient {
    return this.prisma;
  }
}

// Export singleton instance
export const dbTestHelper = DatabaseTestHelper.getInstance();