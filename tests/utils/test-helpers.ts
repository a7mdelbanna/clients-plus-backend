import { faker } from '@faker-js/faker';
import { PrismaClient, User, Company, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { generateAccessToken, generateRefreshToken, generateTokenId } from '../../src/utils/jwt.utils';
import { prismaMock } from '../setup';

// Export prismaMock for use in other test files
export { prismaMock };

export interface MockUser extends User {
  company: Company;
}

export interface TestTokens {
  accessToken: string;
  refreshToken: string;
  user: MockUser;
}

/**
 * Create a mock company
 */
export const createMockCompany = (): Company => ({
  id: faker.string.uuid(),
  name: faker.company.name(),
  email: faker.internet.email(),
  phone: faker.phone.number(),
  website: faker.internet.url(),
  address: {
    street: faker.location.streetAddress(),
    city: faker.location.city(),
    state: faker.location.state(),
    zipCode: faker.location.zipCode(),
    country: faker.location.country()
  },
  logo: null,
  businessType: faker.company.buzzNoun(),
  taxId: faker.string.alphanumeric(10),
  registrationNumber: faker.string.alphanumeric(8),
  subscriptionPlan: 'BASIC',
  subscriptionStatus: 'ACTIVE',
  subscriptionStartDate: faker.date.past(),
  subscriptionEndDate: faker.date.future(),
  billingCycle: 'MONTHLY',
  timezone: 'UTC',
  currency: 'USD',
  dateFormat: 'MM/dd/yyyy',
  timeFormat: '12h',
  isActive: true,
  createdAt: faker.date.past(),
  updatedAt: faker.date.recent()
});

/**
 * Create a mock user
 */
export const createMockUser = (overrides: Partial<User> = {}): MockUser => {
  const company = createMockCompany();
  
  const baseUser = {
    id: faker.string.uuid(),
    email: faker.internet.email(),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    phone: faker.phone.number(),
    avatar: null,
    password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/JZLjl.TdO', // "password123"
    companyId: company.id,
    role: UserRole.USER,
    permissions: null,
    isActive: true,
    isVerified: true,
    lastLoginAt: faker.date.recent(),
    resetToken: null,
    resetTokenExpiry: null,
    verificationToken: null,
    verificationTokenExpiry: null,
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
    ...overrides
  };

  return {
    ...baseUser,
    company,
  } as MockUser;
};

/**
 * Create test tokens for authentication
 */
export const createTestTokens = (user?: Partial<MockUser>): TestTokens => {
  const testUser = user ? createMockUser(user) : createMockUser();
  
  const accessToken = generateAccessToken({
    userId: testUser.id,
    email: testUser.email,
    companyId: testUser.companyId,
    role: testUser.role,
    permissions: testUser.permissions ? (testUser.permissions as string[]) : undefined
  });
  
  const refreshToken = generateRefreshToken({
    userId: testUser.id,
    companyId: testUser.companyId,
    tokenId: generateTokenId()
  });
  
  return {
    accessToken,
    refreshToken,
    user: testUser
  };
};

/**
 * Hash password for testing
 */
export const hashPassword = async (password: string): Promise<string> => {
  return await bcrypt.hash(password, 12);
};

/**
 * Create mock request with user authentication
 */
export const createMockReq = (overrides: any = {}) => ({
  params: {},
  query: {},
  body: {},
  headers: {},
  user: undefined,
  ...overrides
});

/**
 * Create mock response
 */
export const createMockRes = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    end: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis(),
    redirect: jest.fn().mockReturnThis()
  };
  return res;
};

/**
 * Create mock next function
 */
export const createMockNext = () => jest.fn();

/**
 * Mock Prisma responses for common queries
 */
export const mockPrismaUser = (user: MockUser) => {
  prismaMock.user.findUnique.mockResolvedValue(user);
  prismaMock.user.findFirst.mockResolvedValue(user);
  prismaMock.user.create.mockResolvedValue(user);
  prismaMock.user.update.mockResolvedValue(user);
};

export const mockPrismaCompany = (company: Company) => {
  prismaMock.company.findUnique.mockResolvedValue(company);
  prismaMock.company.findFirst.mockResolvedValue(company);
};

/**
 * Reset all mocks
 */
export const resetAllMocks = () => {
  jest.clearAllMocks();
};

/**
 * Sleep utility for testing async operations
 */
export const sleep = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));

/**
 * Generate test data sets
 */
export const generateTestUsers = (count: number): MockUser[] => {
  return Array.from({ length: count }, () => createMockUser());
};

/**
 * Common error messages for testing
 */
export const TestErrors = {
  INVALID_TOKEN: 'Invalid or expired access token',
  MISSING_TOKEN: 'Access token is required',
  TOKEN_EXPIRED: 'Token has expired',
  TOKEN_REVOKED: 'Token has been revoked',
  USER_NOT_FOUND: 'User not found',
  INVALID_CREDENTIALS: 'Invalid email or password',
  USER_EXISTS: 'User with this email already exists',
  COMPANY_NOT_FOUND: 'Company not found',
  COMPANY_INACTIVE: 'Company account is not active',
  VALIDATION_FAILED: 'Validation failed'
};

/**
 * HTTP Status codes for testing
 */
export const TestHttpStatus = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500
};

/**
 * Validation patterns for testing
 */
export const TestPatterns = {
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  JWT: /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_.+/=]*$/,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^[+]?[(]?[\d\s\-\(\)]{10,}$/
};