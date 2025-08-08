# Test Suite Documentation

This document provides comprehensive information about the test suite for the Clients+ Backend API.

## Table of Contents

1. [Overview](#overview)
2. [Test Structure](#test-structure)
3. [Running Tests](#running-tests)
4. [Test Categories](#test-categories)
5. [Testing Tools](#testing-tools)
6. [Writing New Tests](#writing-new-tests)
7. [Test Data Management](#test-data-management)
8. [Debugging Tests](#debugging-tests)
9. [Performance Testing](#performance-testing)
10. [CI/CD Integration](#cicd-integration)
11. [Best Practices](#best-practices)

## Overview

The test suite ensures the reliability, security, and performance of the Clients+ Backend API. It includes unit tests, integration tests, performance tests, and multi-tenant isolation tests.

### Key Features

- **Multi-tenant isolation testing** - Ensures data security across companies
- **Performance benchmarking** - Monitors API response times and resource usage
- **Comprehensive integration tests** - Tests complete API workflows
- **Mock-based unit tests** - Fast, isolated component testing
- **Database transaction safety** - Tests maintain data integrity

## Test Structure

```
tests/
├── README.md                    # This documentation file
├── setup.ts                     # Global test setup and mocks
├── config/
│   └── test.env                 # Test environment configuration
├── fixtures/                    # Test data fixtures
│   ├── branches.json
│   ├── clients.json
│   ├── products.json
│   ├── services.json
│   └── staff.json
├── helpers/                     # Test utilities and helpers
│   ├── auth.ts                  # Authentication helpers
│   ├── database.ts              # Database setup/teardown
│   ├── factories.ts             # Test data factories
│   └── test-helpers.ts          # General test utilities
├── mocks/                       # Mock implementations
├── unit/                        # Unit tests
│   ├── controllers/
│   └── services/
├── integration/                 # Integration tests
│   ├── branch.api.test.ts       # Branch API tests
│   ├── client.api.test.ts       # Client API tests
│   ├── inventory.api.test.ts    # Inventory service tests
│   └── multi-tenant-isolation.test.ts
├── performance/                 # Performance tests
│   └── load.test.ts            # Load testing and benchmarks
└── e2e/                        # End-to-end tests
```

## Running Tests

### Prerequisites

1. **Node.js 18+** installed
2. **PostgreSQL 16+** running
3. **Redis** (optional, for caching tests)

### Environment Setup

1. Copy the test environment file:
   ```bash
   cp tests/config/test.env .env.test
   ```

2. Update database URLs in `.env.test`:
   ```env
   DATABASE_URL=postgresql://user:password@localhost:5432/clients_plus_test
   DATABASE_TEST_URL=postgresql://user:password@localhost:5432/clients_plus_test_integration
   ```

### Running Test Commands

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run specific test categories
npm test -- --testPathPattern=tests/unit
npm test -- --testPathPattern=tests/integration
npm test -- --testPathPattern=tests/performance

# Run specific test file
npm test tests/integration/branch.api.test.ts

# Run tests with verbose output
npm test -- --verbose

# Run tests in band (sequential, not parallel)
npm test -- --runInBand
```

### Database Setup

Tests automatically set up and tear down the test database:

```bash
# Manual database setup (if needed)
npx prisma generate
npx prisma migrate deploy --schema prisma/schema.prisma
```

## Test Categories

### 1. Unit Tests (`tests/unit/`)

Test individual components in isolation using mocks.

**Characteristics:**
- Fast execution (< 100ms per test)
- No database or external dependencies
- Mock all external services
- Focus on business logic

**Example:**
```typescript
describe('UserService', () => {
  it('should hash password before storing', async () => {
    const mockUser = { password: 'plaintext' };
    const hashedUser = await userService.hashPassword(mockUser);
    expect(hashedUser.password).not.toBe('plaintext');
  });
});
```

### 2. Integration Tests (`tests/integration/`)

Test complete API workflows with real database interactions.

**Characteristics:**
- Test entire request/response cycles
- Use real database (test instance)
- Test authentication and authorization
- Verify multi-tenant isolation

**Example:**
```typescript
describe('Branch API', () => {
  it('should create branch with valid data', async () => {
    const response = await request(app)
      .post('/api/v1/branches')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(branchData)
      .expect(201);
    
    expect(response.body.data.name).toBe(branchData.name);
  });
});
```

### 3. Performance Tests (`tests/performance/`)

Measure and benchmark system performance.

**Characteristics:**
- Measure response times
- Test concurrent request handling
- Monitor memory usage
- Identify performance bottlenecks

**Example:**
```typescript
it('should handle 100 concurrent requests under 5 seconds', async () => {
  const requests = Array.from({ length: 100 }, () => 
    request(app).get('/api/v1/clients').set('Authorization', `Bearer ${token}`)
  );
  
  const startTime = Date.now();
  await Promise.all(requests);
  const duration = Date.now() - startTime;
  
  expect(duration).toBeLessThan(5000);
});
```

### 4. Multi-Tenant Isolation Tests

Ensure data security and isolation between companies.

**Characteristics:**
- Test cross-company access prevention
- Verify role-based permissions
- Check data leakage scenarios
- Test concurrent multi-company operations

## Testing Tools

### Core Testing Framework
- **Jest** - Primary testing framework
- **Supertest** - HTTP integration testing
- **TypeScript** - Type-safe test development

### Database Testing
- **Prisma Test Client** - Database operations in tests
- **Database Transactions** - Isolated test data
- **Migration Testing** - Schema change validation

### Authentication Testing
- **JWT Mock Tokens** - Authentication simulation
- **Role-based Test Users** - Permission testing
- **Token Expiration Tests** - Security validation

### Performance Testing
- **Memory Usage Monitoring** - Resource consumption tracking
- **Response Time Measurement** - Performance benchmarking
- **Concurrent Request Testing** - Load testing

## Writing New Tests

### 1. Test File Structure

```typescript
import request from 'supertest';
import { Express } from 'express';
import { AuthTestHelper } from '../helpers/auth';
import { TestDataFactory } from '../helpers/factories';
import { dbHelper, setupTestDatabase, teardownTestDatabase } from '../helpers/database';

let app: Express;
let testCompany: any;
let adminToken: string;

describe('Feature Name Tests', () => {
  beforeAll(async () => {
    app = (await import('../../src/app')).default;
    await setupTestDatabase();
    // Setup test data
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    // Clean up between tests
  });

  describe('Specific functionality', () => {
    it('should perform expected behavior', async () => {
      // Test implementation
    });
  });
});
```

### 2. Using Test Helpers

#### Authentication Helper
```typescript
// Generate admin token
const adminToken = AuthTestHelper.generateToken({
  id: 'user-id',
  companyId: 'company-id',
  role: UserRole.ADMIN,
});

// Generate expired token
const expiredToken = AuthTestHelper.generateExpiredToken();

// Create authorization header
const authHeader = AuthTestHelper.createAuthHeader(token);
```

#### Data Factory
```typescript
// Create test company
const company = TestDataFactory.createCompany({
  name: 'Test Company',
  email: 'test@example.com',
});

// Create test client
const client = TestDataFactory.createClient(companyId, userId, {
  firstName: 'John',
  lastName: 'Doe',
});
```

#### Database Helper
```typescript
// Reset database
await dbHelper.resetDatabase();

// Create test data
const user = await dbHelper.client.user.create({
  data: userData
});

// Count records
const count = await dbHelper.countRecords('clients');
```

### 3. Test Patterns

#### API Testing Pattern
```typescript
it('should perform API operation', async () => {
  const response = await request(app)
    .post('/api/v1/endpoint')
    .set('Authorization', `Bearer ${token}`)
    .send(requestData)
    .expect(201);

  expect(response.body).toMatchObject({
    success: true,
    data: expect.objectContaining({
      id: expect.any(String),
      name: requestData.name,
    }),
  });

  // Verify in database
  const record = await dbHelper.client.model.findUnique({
    where: { id: response.body.data.id }
  });
  expect(record).toBeTruthy();
});
```

#### Multi-Tenant Testing Pattern
```typescript
it('should enforce tenant isolation', async () => {
  // Create data for company1
  const company1Data = await setupCompany1Data();
  
  // Try to access with company2 credentials
  await request(app)
    .get(`/api/v1/company1/${company1Data.id}`)
    .set('Authorization', `Bearer ${company2Token}`)
    .expect(403);

  // Verify company1 can access their data
  await request(app)
    .get(`/api/v1/company1/${company1Data.id}`)
    .set('Authorization', `Bearer ${company1Token}`)
    .expect(200);
});
```

#### Error Testing Pattern
```typescript
it('should handle validation errors', async () => {
  const invalidData = { /* invalid data */ };

  const response = await request(app)
    .post('/api/v1/endpoint')
    .set('Authorization', `Bearer ${token}`)
    .send(invalidData)
    .expect(400);

  expect(response.body).toMatchObject({
    success: false,
    message: 'Validation failed',
    errors: expect.any(Array),
  });
});
```

## Test Data Management

### Data Factories

Test data factories provide consistent, realistic test data:

```typescript
// Simple factory usage
const client = TestDataFactory.createClient(companyId, userId);

// Factory with overrides
const adminUser = TestDataFactory.createAdminUser(companyId, {
  email: 'specific@email.com',
  firstName: 'CustomName',
});

// Batch creation
const clients = TestDataFactory.createBatch(
  () => TestDataFactory.createClient(companyId, userId),
  10 // Create 10 clients
);
```

### Database Management

Tests use database transactions to ensure isolation:

```typescript
beforeEach(async () => {
  // Clean up specific tables
  await dbHelper.client.client.deleteMany({
    where: { companyId: testCompany.id }
  });
});

// Or reset entire database
beforeEach(async () => {
  await dbHelper.resetDatabase();
});
```

### Test Data Fixtures

Static test data is stored in JSON fixtures:

```typescript
// Load fixture data
const branchFixtures = require('../fixtures/branches.json');

// Use in tests
const testBranch = await dbHelper.client.branch.create({
  data: branchFixtures.mainBranch
});
```

## Debugging Tests

### Running Single Tests

```bash
# Run specific test file
npm test tests/integration/branch.api.test.ts

# Run specific test case
npm test -- --testNamePattern="should create branch"

# Run with debug output
npm test -- --verbose --no-coverage
```

### Database Debugging

```bash
# View test database
npx prisma studio

# Check database schema
npx prisma db pull --print

# View migration status
npx prisma migrate status
```

### Common Issues and Solutions

#### Issue: Database connection errors
```bash
# Solution: Ensure PostgreSQL is running and accessible
docker run --name postgres-test -p 5432:5432 -e POSTGRES_PASSWORD=postgres -d postgres:16
```

#### Issue: Tests timing out
```bash
# Solution: Increase timeout or run sequentially
npm test -- --runInBand --testTimeout=60000
```

#### Issue: Memory leaks in tests
```bash
# Solution: Run with memory debugging
npm test -- --detectOpenHandles --forceExit
```

### Debug Configuration

Add to VS Code `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Jest Tests",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": [
    "--runInBand",
    "--no-coverage",
    "${relativeFile}"
  ],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

## Performance Testing

### Performance Metrics

The performance test suite measures:

- **Response Time** - API endpoint response times
- **Throughput** - Requests handled per second
- **Memory Usage** - Heap and RSS memory consumption
- **Database Performance** - Query execution times
- **Concurrent Handling** - Performance under load

### Running Performance Tests

```bash
# Run all performance tests
npm test -- --testPathPattern=tests/performance

# Run with performance reporting
npm test -- --testPathPattern=tests/performance --verbose

# Run load tests only
npm test tests/performance/load.test.ts
```

### Performance Benchmarks

Current performance targets:

- **Health Check**: < 100ms
- **Authentication**: < 500ms
- **Simple Queries**: < 1 second
- **Complex Queries**: < 2 seconds
- **Concurrent Requests (20)**: < 5 seconds
- **Memory Usage**: < 100MB increase during tests

### Monitoring Performance

Performance metrics are logged during test execution:

```
=== PERFORMANCE TEST REPORT ===
Operation                    Duration (ms)    Memory (MB)    Requests
------------------------------------------------------------------------------
Health Check                 45              2.1            1
Simple Query (10 clients)    234             5.4            1
Concurrent Requests (20)     1,876           12.3           20
Large Dataset Query          2,134           18.7           1
------------------------------------------------------------------------------
Average Duration: 1,072.25ms
```

## CI/CD Integration

### GitHub Actions Workflow

The test suite integrates with GitHub Actions for automated testing:

- **Pull Request Testing** - All tests run on PR creation
- **Main Branch Testing** - Full test suite including performance tests
- **Nightly Testing** - Extended test suite with larger datasets
- **Security Scanning** - Dependency vulnerability checks

### Test Stages

1. **Code Quality** - Linting, formatting, type checking
2. **Unit Tests** - Fast component tests
3. **Integration Tests** - API endpoint tests
4. **Performance Tests** - Load testing and benchmarks
5. **Security Tests** - Vulnerability scanning
6. **E2E Tests** - Complete workflow testing

### Coverage Requirements

- **Minimum Coverage**: 80%
- **Critical Paths**: 95%
- **New Code**: 90%

### Test Results

Test results are published to:

- **GitHub Actions** - Test status and logs
- **Codecov** - Coverage reports and trends
- **Performance Dashboard** - Performance metrics over time

## Best Practices

### Test Organization

1. **Group Related Tests** - Use `describe` blocks for logical grouping
2. **Descriptive Names** - Test names should clearly describe expected behavior
3. **Single Responsibility** - Each test should verify one specific behavior
4. **Arrange-Act-Assert** - Structure tests with clear setup, execution, and verification

### Performance Considerations

1. **Use `runInBand`** - For integration tests to avoid database conflicts
2. **Clean Up Resources** - Always close connections and clean up data
3. **Optimize Test Data** - Create minimal data needed for each test
4. **Parallel Execution** - Use Jest's parallel execution for unit tests

### Security Testing

1. **Test All Auth Scenarios** - Valid tokens, expired tokens, invalid tokens
2. **Multi-Tenant Isolation** - Verify users cannot access other companies' data
3. **Input Validation** - Test boundary conditions and malicious input
4. **Role-Based Access** - Verify permissions are enforced correctly

### Debugging Tips

1. **Use `console.log`** - Add debug output for complex test scenarios
2. **Test Isolation** - Run single tests to isolate issues
3. **Database State** - Check database state when tests fail unexpectedly
4. **Mock Verification** - Ensure mocks are called as expected

### Code Quality

1. **Type Safety** - Use TypeScript for all test code
2. **ESLint Rules** - Follow linting rules for test code
3. **DRY Principle** - Extract common test logic into helpers
4. **Consistent Style** - Follow project coding standards

### Maintenance

1. **Regular Updates** - Keep test dependencies updated
2. **Performance Monitoring** - Track test execution time trends
3. **Coverage Analysis** - Regularly review coverage reports
4. **Test Data Cleanup** - Remove obsolete test data and fixtures

---

## Support

For questions about the test suite, please:

1. Check this documentation first
2. Review existing test examples
3. Ask in team chat or create an issue
4. Update documentation when adding new testing patterns

Remember: **Good tests are investments in code quality and team productivity!**