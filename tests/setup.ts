import 'reflect-metadata';
import { PrismaClient } from '@prisma/client';
import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended';

// Create a mock instance
export const prismaMock = mockDeep<PrismaClient>() as unknown as DeepMockProxy<PrismaClient>;

// Export enums from Prisma (only the ones that exist)
export { UserRole, SubscriptionPlan, SubscriptionStatus, BillingCycle, AppointmentStatus, InvoiceStatus, PaymentStatus, PaymentMethod, ClientStatus } from '@prisma/client';

// Mock Prisma Client
jest.mock('@prisma/client', () => ({
  __esModule: true,
  PrismaClient: jest.fn().mockImplementation(() => prismaMock),
  UserRole: {
    SUPER_ADMIN: 'SUPER_ADMIN',
    ADMIN: 'ADMIN',
    MANAGER: 'MANAGER',
    USER: 'USER',
    STAFF: 'STAFF',
    RECEPTIONIST: 'RECEPTIONIST',
  },
  SubscriptionPlan: {
    BASIC: 'BASIC',
    PREMIUM: 'PREMIUM',
    ENTERPRISE: 'ENTERPRISE',
  },
  SubscriptionStatus: {
    ACTIVE: 'ACTIVE',
    EXPIRED: 'EXPIRED',
    CANCELLED: 'CANCELLED',
    SUSPENDED: 'SUSPENDED',
  },
  BillingCycle: {
    MONTHLY: 'MONTHLY',
    QUARTERLY: 'QUARTERLY',
    YEARLY: 'YEARLY',
  },
  AppointmentStatus: {
    SCHEDULED: 'SCHEDULED',
    CONFIRMED: 'CONFIRMED',
    IN_PROGRESS: 'IN_PROGRESS',
    COMPLETED: 'COMPLETED',
    CANCELLED: 'CANCELLED',
    NO_SHOW: 'NO_SHOW',
  },
  InvoiceStatus: {
    DRAFT: 'DRAFT',
    SENT: 'SENT',
    PAID: 'PAID',
    PARTIALLY_PAID: 'PARTIALLY_PAID',
    OVERDUE: 'OVERDUE',
    CANCELLED: 'CANCELLED',
  },
  PaymentStatus: {
    PENDING: 'PENDING',
    COMPLETED: 'COMPLETED',
    FAILED: 'FAILED',
    REFUNDED: 'REFUNDED',
  },
  PaymentMethod: {
    CASH: 'CASH',
    CARD: 'CARD',
    BANK_TRANSFER: 'BANK_TRANSFER',
    CHECK: 'CHECK',
    OTHER: 'OTHER',
  },
  ClientStatus: {
    ACTIVE: 'ACTIVE',
    INACTIVE: 'INACTIVE',
    BLOCKED: 'BLOCKED',
  },
}));

// Reset mocks before each test
beforeEach(() => {
  mockReset(prismaMock);
});

// Setup test environment variables
process.env['NODE_ENV'] = 'test';
process.env['JWT_SECRET'] = 'test-jwt-secret-for-testing-only-not-production-use-long-enough-to-be-secure';
process.env['JWT_REFRESH_SECRET'] = 'test-jwt-refresh-secret-for-testing-only-not-production-use-long-enough';
process.env['JWT_EXPIRES_IN'] = '15m';
process.env['JWT_REFRESH_EXPIRES_IN'] = '7d';
process.env['DATABASE_URL'] = 'postgresql://test:test@localhost:5432/test_db';
process.env['BCRYPT_ROUNDS'] = '4'; // Lower rounds for faster tests
process.env['SESSION_SECRET'] = 'test-session-secret';
process.env['LOG_LEVEL'] = 'silent';
process.env['CORS_ORIGIN'] = 'http://localhost:3001';
process.env['API_PREFIX'] = '/api/v1';
process.env['SMTP_HOST'] = 'smtp.example.com';
process.env['SMTP_PORT'] = '587';
process.env['SMTP_SECURE'] = 'false';
process.env['SMTP_USER'] = 'test@example.com';
process.env['SMTP_PASS'] = 'test-password';
process.env['FROM_EMAIL'] = 'noreply@example.com';
process.env['FROM_NAME'] = 'Test App';

// Suppress console logs during tests
const originalConsole = global.console;
beforeAll(() => {
  global.console = {
    ...originalConsole,
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  };
});

afterAll(() => {
  global.console = originalConsole;
});

// Set test timeout
jest.setTimeout(30000);