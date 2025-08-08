import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class DatabaseTestHelper {
  private static instance: DatabaseTestHelper;
  private prisma: PrismaClient;

  private constructor() {
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_TEST_URL || process.env.DATABASE_URL,
        },
      },
    });
  }

  static getInstance(): DatabaseTestHelper {
    if (!DatabaseTestHelper.instance) {
      DatabaseTestHelper.instance = new DatabaseTestHelper();
    }
    return DatabaseTestHelper.instance;
  }

  get client() {
    return this.prisma;
  }

  /**
   * Reset the database to a clean state
   */
  async resetDatabase(): Promise<void> {
    // Delete all data in reverse dependency order
    const tablesToTruncate = [
      'audit_logs',
      'reports',
      'company_settings',
      'staff_time_offs',
      'appointment_invoices',
      'invoice_items',
      'payments',
      'invoices',
      'appointments',
      'staff_services',
      'service_branches',
      'services',
      'staff',
      'branches',
      'clients',
      'users',
      'companies',
    ];

    // Use raw SQL for faster truncation
    await this.prisma.$transaction(
      tablesToTruncate.map((table) =>
        this.prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`)
      )
    );

    // Reset sequences
    for (const table of tablesToTruncate) {
      try {
        await this.prisma.$executeRawUnsafe(
          `ALTER SEQUENCE IF EXISTS "${table}_id_seq" RESTART WITH 1;`
        );
      } catch {
        // Ignore if sequence doesn't exist
      }
    }
  }

  /**
   * Close the database connection
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }

  /**
   * Create a test database if it doesn't exist
   */
  async createTestDatabase(): Promise<void> {
    const dbUrl = process.env.DATABASE_TEST_URL || process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new Error('No database URL configured for tests');
    }

    const url = new URL(dbUrl);
    const dbName = url.pathname.slice(1); // Remove leading slash
    
    // Connect to postgres database to create test db
    const postgresUrl = `${url.protocol}//${url.username}:${url.password}@${url.host}/postgres`;
    
    try {
      const createDbClient = new PrismaClient({
        datasources: { db: { url: postgresUrl } }
      });

      await createDbClient.$executeRawUnsafe(
        `CREATE DATABASE "${dbName}" WITH TEMPLATE template0;`
      );
      
      await createDbClient.$disconnect();
    } catch (error: any) {
      // Database might already exist
      if (!error.message.includes('already exists')) {
        console.warn('Could not create test database:', error.message);
      }
    }
  }

  /**
   * Run migrations on test database
   */
  async runMigrations(): Promise<void> {
    try {
      await execAsync('npx prisma migrate deploy', {
        env: {
          ...process.env,
          DATABASE_URL: process.env.DATABASE_TEST_URL || process.env.DATABASE_URL,
        },
      });
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  }

  /**
   * Generate Prisma client for test database
   */
  async generateClient(): Promise<void> {
    try {
      await execAsync('npx prisma generate');
    } catch (error) {
      console.error('Prisma generate failed:', error);
      throw error;
    }
  }

  /**
   * Count records in a table
   */
  async countRecords(table: string): Promise<number> {
    const result = await this.prisma.$executeRawUnsafe(
      `SELECT COUNT(*) as count FROM "${table}"`
    );
    return parseInt((result as any)[0].count);
  }

  /**
   * Check if a table exists
   */
  async tableExists(tableName: string): Promise<boolean> {
    try {
      const result = await this.prisma.$executeRawUnsafe(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )`,
        tableName
      );
      return (result as any)[0].exists;
    } catch {
      return false;
    }
  }

  /**
   * Execute raw SQL for advanced testing scenarios
   */
  async executeRaw(sql: string, params?: any[]): Promise<any> {
    if (params) {
      return await this.prisma.$executeRawUnsafe(sql, ...params);
    }
    return await this.prisma.$executeRawUnsafe(sql);
  }

  /**
   * Query raw SQL for advanced testing scenarios
   */
  async queryRaw(sql: string, params?: any[]): Promise<any> {
    if (params) {
      return await this.prisma.$queryRawUnsafe(sql, ...params);
    }
    return await this.prisma.$queryRawUnsafe(sql);
  }

  /**
   * Create a test transaction
   */
  async transaction<T>(fn: (tx: PrismaClient) => Promise<T>): Promise<T> {
    return await this.prisma.$transaction(fn);
  }

  /**
   * Seed minimal test data for multi-tenant testing
   */
  async seedMinimalData() {
    // Create test companies
    const company1 = await this.prisma.company.create({
      data: {
        id: 'test-company-1',
        name: 'Test Company 1',
        email: 'test1@example.com',
        subscriptionPlan: 'PROFESSIONAL',
        timezone: 'UTC',
      },
    });

    const company2 = await this.prisma.company.create({
      data: {
        id: 'test-company-2',
        name: 'Test Company 2',
        email: 'test2@example.com',
        subscriptionPlan: 'BASIC',
        timezone: 'UTC',
      },
    });

    // Create admin users for each company
    const user1 = await this.prisma.user.create({
      data: {
        email: 'admin@test1.com',
        firstName: 'Admin',
        lastName: 'User',
        password: '$2b$04$9O8QT0Z7QY.X1Q7ZZ7Z7ZuQ', // "password"
        companyId: company1.id,
        role: 'ADMIN',
        isVerified: true,
      },
    });

    const user2 = await this.prisma.user.create({
      data: {
        email: 'admin@test2.com',
        firstName: 'Admin',
        lastName: 'User',
        password: '$2b$04$9O8QT0Z7QY.X1Q7ZZ7Z7ZuQ', // "password"
        companyId: company2.id,
        role: 'ADMIN',
        isVerified: true,
      },
    });

    // Create main branches for each company
    const branch1 = await this.prisma.branch.create({
      data: {
        id: 'test-branch-1',
        name: 'Main Branch',
        companyId: company1.id,
        type: 'MAIN',
        address: {
          street: '123 Test St',
          city: 'Test City',
          country: 'Test Country',
        },
      },
    });

    const branch2 = await this.prisma.branch.create({
      data: {
        id: 'test-branch-2',
        name: 'Main Branch',
        companyId: company2.id,
        type: 'MAIN',
        address: {
          street: '456 Test Ave',
          city: 'Test City',
          country: 'Test Country',
        },
      },
    });

    return {
      companies: [company1, company2],
      users: [user1, user2],
      branches: [branch1, branch2],
    };
  }
}

// Global test database helper instance
export const dbHelper = DatabaseTestHelper.getInstance();

// Setup and teardown helpers for Jest
export const setupTestDatabase = async () => {
  await dbHelper.createTestDatabase();
  await dbHelper.runMigrations();
  await dbHelper.generateClient();
};

export const teardownTestDatabase = async () => {
  await dbHelper.resetDatabase();
  await dbHelper.disconnect();
};

export const resetTestDatabase = async () => {
  await dbHelper.resetDatabase();
};