# Clients+ Developer Guide

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Development Setup](#development-setup)
3. [Code Structure](#code-structure)
4. [API Patterns](#api-patterns)
5. [Testing Guidelines](#testing-guidelines)
6. [Contributing Guide](#contributing-guide)
7. [Code Standards](#code-standards)
8. [Debugging Guide](#debugging-guide)

## Architecture Overview

### System Architecture

The Clients+ backend follows a modern, scalable architecture built on Express.js with TypeScript, PostgreSQL, and Redis.

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Applications                      │
├─────────────────┬─────────────────┬─────────────────────────┤
│   Dashboard     │   Booking App   │    Mobile Apps          │
│   (React)       │   (React)       │    (React Native)       │
└─────────────────┴─────────────────┴─────────────────────────┘
                           │
                  ┌────────▼────────┐
                  │   Load Balancer │
                  │     (Nginx)     │
                  └────────┬────────┘
                           │
┌─────────────────────────────────────────────────────────────┐
│                  Express.js API Layer                      │
├─────────────────┬─────────────────┬─────────────────────────┤
│  Authentication │   Controllers   │    WebSocket Server     │
│   Middleware    │   & Services    │     (Socket.IO)         │
└─────────────────┴─────────────────┴─────────────────────────┘
                           │
    ┌──────────────────────┼──────────────────────┐
    │                      │                      │
┌───▼────┐        ┌───────▼────────┐      ┌─────▼─────┐
│PostreSQL│        │     Redis      │      │  External │
│Database │        │     Cache      │      │  Services │
│         │        │   & Sessions   │      │ (WhatsApp)│
└─────────┘        └────────────────┘      └───────────┘
```

### Key Components

#### 1. Multi-Tenant Architecture
- **Company Isolation**: Each company's data is completely isolated
- **JWT-based Auth**: Company context embedded in tokens
- **Middleware Enforcement**: Automatic tenant filtering in all queries

#### 2. Service Layer Pattern
```typescript
// Service handles business logic
class AppointmentService {
  async createAppointment(data: AppointmentInput): Promise<string> {
    // Validation
    // Business logic
    // Database operations
    // Event emission
  }
}

// Controller handles HTTP concerns
class AppointmentController {
  async createAppointment(req: Request, res: Response) {
    // Request validation
    // Service call
    // Response formatting
    // Error handling
  }
}
```

#### 3. Real-time Architecture
```typescript
// WebSocket integration with business events
class AppointmentService {
  async createAppointment(data: AppointmentInput): Promise<string> {
    const appointmentId = await this.repository.create(data);
    
    // Emit real-time event
    socketServer.emit('appointment_created', {
      companyId: data.companyId,
      appointment: await this.getAppointmentById(appointmentId)
    });
    
    return appointmentId;
  }
}
```

### Technology Stack

**Core Technologies:**
- **Runtime**: Node.js 18+
- **Language**: TypeScript 4.9+
- **Framework**: Express.js 4.18+
- **Database**: PostgreSQL 14+
- **ORM**: Prisma 5.0+
- **Cache**: Redis 7.0+
- **WebSocket**: Socket.IO 4.7+

**Development Tools:**
- **Testing**: Jest + Supertest
- **Linting**: ESLint + Prettier
- **Type Checking**: TypeScript Compiler
- **Build**: TSC + Webpack
- **Container**: Docker + Docker Compose

## Development Setup

### Prerequisites

Ensure you have the following installed:
- Node.js 18+ and npm
- PostgreSQL 14+
- Redis 7.0+
- Docker & Docker Compose (optional)

### Local Development Setup

#### 1. Clone Repository
```bash
git clone https://github.com/company/clients-plus-backend.git
cd clients-plus-backend
```

#### 2. Install Dependencies
```bash
npm install
```

#### 3. Environment Configuration
```bash
# Copy environment template
cp .env.example .env.development

# Edit environment variables
vim .env.development
```

Required environment variables:
```bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/clients_plus_dev"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRES_IN="24h"

# Node Environment
NODE_ENV="development"
PORT=3000

# External Services
WHATSAPP_TOKEN="your-whatsapp-token"
SMTP_HOST="smtp.gmail.com"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
```

#### 4. Database Setup
```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev --name init

# Seed development data
npm run seed:dev
```

#### 5. Start Development Server
```bash
# Start in development mode
npm run dev

# Or with Docker
docker-compose up -d
npm run dev
```

#### 6. Verify Setup
```bash
# Test API health
curl http://localhost:3000/api/v1/health

# Expected response:
{
  "status": "ok",
  "timestamp": "2024-08-09T12:00:00.000Z",
  "services": {
    "database": "connected",
    "redis": "connected"
  }
}
```

### Docker Development Environment

#### Complete Development Stack
```yaml
# docker-compose.dev.yml
version: '3.8'
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://postgres:password@postgres:5432/clients_plus_dev
      - REDIS_URL=redis://redis:6379
    volumes:
      - .:/app
      - /app/node_modules
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:14
    environment:
      POSTGRES_DB: clients_plus_dev
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

Start development environment:
```bash
docker-compose -f docker-compose.dev.yml up -d
```

## Code Structure

### Project Directory Structure

```
src/
├── app.ts                      # Express app configuration
├── server.ts                   # Server entry point
├── config/                     # Configuration files
│   ├── database.ts             # Database connection
│   ├── env.ts                  # Environment validation
│   └── logger.ts               # Logging configuration
├── controllers/                # HTTP request handlers
│   ├── auth.controller.ts      # Authentication endpoints
│   ├── appointment.controller.ts
│   ├── client.controller.ts
│   └── ...
├── services/                   # Business logic layer
│   ├── auth.service.ts         # Authentication business logic
│   ├── appointment.service.ts  # Appointment business logic
│   ├── booking.service.ts      # Public booking logic
│   └── ...
├── middleware/                 # Express middleware
│   ├── auth.middleware.ts      # JWT authentication
│   ├── tenant.middleware.ts    # Multi-tenant context
│   ├── validation.middleware.ts # Request validation
│   └── ...
├── routes/                     # Route definitions
│   ├── auth.routes.ts          # Authentication routes
│   ├── appointment.routes.ts   # Appointment routes
│   └── ...
├── utils/                      # Utility functions
│   ├── response.ts             # Standardized responses
│   ├── validation.ts           # Validation helpers
│   └── jwt.utils.ts            # JWT utilities
├── types/                      # TypeScript type definitions
│   └── index.ts                # Shared types
├── websocket/                  # WebSocket implementation
│   ├── socket.server.ts        # Socket.IO server
│   └── handlers/               # WebSocket event handlers
└── templates/                  # Message templates
    └── messages.ts             # Notification templates
```

### Naming Conventions

#### Files and Directories
- **Controllers**: `*.controller.ts`
- **Services**: `*.service.ts`
- **Routes**: `*.routes.ts`
- **Middleware**: `*.middleware.ts`
- **Tests**: `*.test.ts` or `*.spec.ts`
- **Types**: `*.types.ts` or `index.ts` in types folder

#### Code Elements
```typescript
// Classes: PascalCase
class AppointmentService { }
class UserController { }

// Functions and variables: camelCase
const getUserById = async (id: string) => { }
const appointmentData = { }

// Constants: SCREAMING_SNAKE_CASE
const MAX_APPOINTMENTS_PER_DAY = 50;
const DEFAULT_TIMEZONE = 'UTC';

// Interfaces: PascalCase with 'I' prefix (optional)
interface AppointmentInput { }
interface IUserService { }

// Enums: PascalCase
enum AppointmentStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  COMPLETED = 'COMPLETED'
}
```

### Design Patterns

#### 1. Repository Pattern (via Prisma)
```typescript
// Service uses Prisma as repository
class ClientService {
  constructor(private prisma: PrismaClient) {}

  async createClient(data: ClientInput): Promise<string> {
    const client = await this.prisma.client.create({
      data: {
        ...data,
        companyId: data.companyId // Always include company context
      }
    });
    return client.id;
  }

  async getClientById(id: string, companyId: string): Promise<Client> {
    const client = await this.prisma.client.findFirst({
      where: {
        id,
        companyId // Automatic tenant filtering
      }
    });
    
    if (!client) {
      throw new Error('Client not found');
    }
    
    return client;
  }
}
```

#### 2. Middleware Chain Pattern
```typescript
// Route with middleware chain
router.post('/appointments',
  authMiddleware,           // Authentication
  tenantMiddleware,         // Tenant context
  validateRequest(schema),  // Request validation
  rateLimitMiddleware,      // Rate limiting
  appointmentController.createAppointment // Business logic
);
```

#### 3. Event-Driven Architecture
```typescript
// Service emits events for other systems
class AppointmentService {
  async completeAppointment(id: string): Promise<void> {
    const appointment = await this.updateStatus(id, 'COMPLETED');
    
    // Emit events for other systems
    EventBus.emit('appointment.completed', appointment);
    EventBus.emit('invoice.generate', { appointmentId: id });
    EventBus.emit('notification.send', {
      type: 'completion_confirmation',
      clientId: appointment.clientId
    });
  }
}
```

## API Patterns

### Standardized Response Format

#### Success Response
```typescript
// utils/response.ts
export const successResponse = (
  res: Response,
  message: string,
  data: any = null,
  statusCode: number = 200
) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  });
};

// Usage in controller
successResponse(res, 'Appointment created successfully', {
  appointmentId: 'uuid-here',
  appointment: appointmentData
}, 201);
```

#### Error Response
```typescript
export const errorResponse = (
  res: Response,
  message: string,
  statusCode: number = 500,
  details: any = null
) => {
  return res.status(statusCode).json({
    success: false,
    error: {
      message,
      code: `ERR_${statusCode}`,
      details
    },
    timestamp: new Date().toISOString()
  });
};

// Usage in controller
errorResponse(res, 'Appointment not found', 404);
```

### Request Validation Pattern

```typescript
import { z } from 'zod';

// Define validation schema
const createAppointmentSchema = z.object({
  clientId: z.string().uuid('Invalid client ID format'),
  serviceIds: z.array(z.string().uuid()).min(1, 'At least one service required'),
  date: z.string().refine(date => !isNaN(Date.parse(date)), 'Invalid date format'),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format')
});

// Use in controller
async createAppointment(req: Request, res: Response) {
  try {
    const validation = createAppointmentSchema.safeParse(req.body);
    if (!validation.success) {
      return errorResponse(res, 'Validation error', 400, validation.error.errors);
    }
    
    const data = validation.data;
    // Process valid data
  } catch (error) {
    return errorResponse(res, 'Internal server error');
  }
}
```

### Authentication & Authorization Pattern

```typescript
// Multi-tenant JWT middleware
export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return errorResponse(res, 'Authentication token required', 401);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    
    // Set user context
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      companyId: decoded.companyId
    };
    
    next();
  } catch (error) {
    return errorResponse(res, 'Invalid or expired token', 401);
  }
};

// Role-based authorization
export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return errorResponse(res, 'Insufficient permissions', 403);
    }
    next();
  };
};

// Usage in routes
router.delete('/appointments/:id', 
  authMiddleware,
  requireRole(['ADMIN', 'MANAGER']),
  appointmentController.cancelAppointment
);
```

### Pagination Pattern

```typescript
// Standardized pagination
export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export const paginateResults = async <T>(
  query: any,
  options: PaginationOptions
): Promise<PaginatedResult<T>> => {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(1, options.limit || 10));
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    query.skip(skip).take(limit),
    query.count()
  ]);

  return {
    data: items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1
    }
  };
};
```

## Testing Guidelines

### Testing Structure

```
tests/
├── unit/                       # Unit tests
│   ├── services/               # Service layer tests
│   ├── controllers/            # Controller tests
│   └── utils/                  # Utility function tests
├── integration/                # API integration tests
│   ├── auth.api.test.ts        # Authentication flow tests
│   ├── appointment.api.test.ts # Appointment API tests
│   └── client.api.test.ts      # Client API tests
├── e2e/                       # End-to-end tests
│   └── booking-flow.test.ts    # Complete user journeys
├── performance/               # Load and performance tests
│   └── load.test.ts           # Concurrent request tests
├── fixtures/                  # Test data
│   ├── clients.json           # Sample client data
│   └── appointments.json      # Sample appointment data
└── helpers/                   # Test utilities
    ├── database.ts            # Database test helpers
    └── auth.ts                # Authentication helpers
```

### Unit Testing Pattern

```typescript
// tests/unit/services/appointment.service.test.ts
import { AppointmentService } from '../../../src/services/appointment.service';
import { mockPrismaClient } from '../../mocks/prisma';

describe('AppointmentService', () => {
  let appointmentService: AppointmentService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = mockPrismaClient();
    appointmentService = new AppointmentService(mockPrisma);
  });

  describe('createAppointment', () => {
    it('should create appointment successfully', async () => {
      // Arrange
      const appointmentData = {
        clientId: 'client-uuid',
        serviceIds: ['service-uuid'],
        date: new Date('2024-08-15'),
        startTime: '10:00',
        companyId: 'company-uuid'
      };

      mockPrisma.appointment.create.mockResolvedValue({
        id: 'appointment-uuid',
        ...appointmentData
      });

      // Act
      const result = await appointmentService.createAppointment(appointmentData);

      // Assert
      expect(result).toBe('appointment-uuid');
      expect(mockPrisma.appointment.create).toHaveBeenCalledWith({
        data: expect.objectContaining(appointmentData)
      });
    });

    it('should throw error for invalid data', async () => {
      // Arrange
      const invalidData = { clientId: 'invalid' };

      // Act & Assert
      await expect(appointmentService.createAppointment(invalidData as any))
        .rejects.toThrow('Invalid appointment data');
    });
  });
});
```

### Integration Testing Pattern

```typescript
// tests/integration/appointment.api.test.ts
import request from 'supertest';
import { app } from '../../src/app';
import { setupTestDatabase, cleanupTestDatabase } from '../helpers/database';
import { createAuthToken } from '../helpers/auth';

describe('/api/v1/appointments', () => {
  let authToken: string;
  let companyId: string;

  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  beforeEach(async () => {
    const { token, company } = await createAuthToken('ADMIN');
    authToken = token;
    companyId = company.id;
  });

  describe('POST /appointments', () => {
    it('should create appointment successfully', async () => {
      const appointmentData = {
        clientId: 'client-uuid',
        serviceIds: ['service-uuid'],
        date: '2024-08-15',
        startTime: '10:00'
      };

      const response = await request(app)
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .send(appointmentData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.appointmentId).toBeDefined();
    });

    it('should reject unauthorized request', async () => {
      await request(app)
        .post('/api/v1/appointments')
        .send({})
        .expect(401);
    });
  });
});
```

### Test Data Management

```typescript
// tests/helpers/database.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const setupTestDatabase = async () => {
  // Reset database
  await prisma.$executeRaw`TRUNCATE TABLE "User", "Company", "Client", "Appointment" RESTART IDENTITY CASCADE;`;
  
  // Seed test data
  await seedTestData();
};

export const cleanupTestDatabase = async () => {
  await prisma.$disconnect();
};

export const seedTestData = async () => {
  // Create test company
  const company = await prisma.company.create({
    data: {
      name: 'Test Company',
      email: 'test@company.com',
      subdomain: 'testcompany'
    }
  });

  // Create test user
  await prisma.user.create({
    data: {
      email: 'admin@test.com',
      name: 'Test Admin',
      role: 'ADMIN',
      companyId: company.id
    }
  });

  return { company };
};
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test suite
npm run test:unit
npm run test:integration
npm run test:e2e
npm run test:performance

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- appointment.service.test.ts
```

## Contributing Guide

### Development Workflow

#### 1. Feature Development
```bash
# Create feature branch
git checkout -b feature/appointment-reminders

# Make your changes
# Write tests
# Update documentation

# Commit with conventional commit format
git commit -m "feat(appointments): add automated reminder system"

# Push and create PR
git push origin feature/appointment-reminders
```

#### 2. Commit Message Convention
```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Test additions or changes
- `chore`: Build process or auxiliary tool changes

Examples:
```
feat(auth): implement multi-factor authentication
fix(appointments): resolve double-booking issue
docs(api): update authentication documentation
test(services): add unit tests for appointment service
```

#### 3. Pull Request Process
1. **Branch**: Create feature branch from `main`
2. **Tests**: Ensure all tests pass
3. **Linting**: Fix all linting issues
4. **Documentation**: Update relevant documentation
5. **Review**: Request review from team members
6. **Merge**: Use squash merge for clean history

### Code Review Guidelines

#### What to Review
- **Logic Correctness**: Does the code do what it's supposed to do?
- **Security**: Are there any security vulnerabilities?
- **Performance**: Will this code perform well under load?
- **Maintainability**: Is the code readable and maintainable?
- **Testing**: Are there adequate tests?
- **Documentation**: Is the code documented appropriately?

#### Review Checklist
- [ ] Code follows project standards
- [ ] Tests are included and pass
- [ ] Documentation is updated
- [ ] Security considerations addressed
- [ ] Performance impact considered
- [ ] Breaking changes documented

## Code Standards

### TypeScript Standards

#### Strict Type Checking
```typescript
// Enable strict mode in tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true
  }
}

// Always type function parameters and return values
async function createAppointment(
  data: AppointmentInput,
  userId: string
): Promise<AppointmentResponse> {
  // Implementation
}

// Use proper type guards
function isValidDate(value: unknown): value is Date {
  return value instanceof Date && !isNaN(value.getTime());
}
```

#### Interface Design
```typescript
// Use specific, descriptive interfaces
interface AppointmentCreateRequest {
  readonly clientId: string;
  readonly serviceIds: readonly string[];
  readonly date: string;
  readonly startTime: string;
  readonly notes?: string;
}

// Prefer composition over inheritance
interface Timestamped {
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

interface Appointment extends Timestamped {
  readonly id: string;
  readonly clientId: string;
  readonly staffId: string;
  // ... other properties
}
```

### ESLint Configuration

```javascript
// .eslintrc.js
module.exports = {
  extends: [
    '@typescript-eslint/recommended',
    'prettier'
  ],
  rules: {
    '@typescript-eslint/explicit-function-return-type': 'error',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': 'error',
    'prefer-const': 'error',
    'no-var': 'error'
  }
};
```

### Database Standards

#### Prisma Schema Design
```prisma
// Always include audit fields
model Appointment {
  id        String   @id @default(cuid())
  companyId String   // Always include for multi-tenancy
  clientId  String
  staffId   String
  
  // Business fields
  date      DateTime
  startTime String
  status    AppointmentStatus @default(PENDING)
  
  // Audit fields (required)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  createdBy String?
  updatedBy String?
  
  // Relations
  company   Company @relation(fields: [companyId], references: [id])
  client    Client  @relation(fields: [clientId], references: [id])
  staff     Staff   @relation(fields: [staffId], references: [id])
  
  // Indexes for performance
  @@index([companyId, date])
  @@index([staffId, date])
  @@index([clientId])
}
```

#### Query Optimization
```typescript
// Always include company filter
const appointments = await prisma.appointment.findMany({
  where: {
    companyId: req.user.companyId, // Required
    date: {
      gte: startDate,
      lte: endDate
    }
  },
  include: {
    client: {
      select: { name: true, phone: true } // Only select needed fields
    },
    staff: {
      select: { name: true }
    }
  },
  orderBy: { date: 'asc' }
});
```

## Debugging Guide

### Logging Best Practices

```typescript
// Use structured logging
import { logger } from '../config/logger';

// Log with context
logger.info('Appointment created', {
  appointmentId,
  clientId,
  staffId,
  companyId,
  timestamp: new Date().toISOString(),
  action: 'appointment_created',
  userId: req.user.id
});

// Log errors with full context
logger.error('Database query failed', {
  error: error.message,
  stack: error.stack,
  query: 'findManyAppointments',
  parameters: { companyId, date },
  timestamp: new Date().toISOString()
});
```

### Common Debugging Scenarios

#### 1. Database Query Issues
```bash
# Enable Prisma query logging
export DEBUG="prisma:query,prisma:info,prisma:warn"
npm run dev

# Monitor slow queries
tail -f logs/slow-query.log
```

#### 2. Authentication Issues
```typescript
// Debug JWT tokens
const decoded = jwt.verify(token, process.env.JWT_SECRET!);
console.log('Token payload:', decoded);

// Check middleware execution
export const debugMiddleware = (req: Request, res: Response, next: NextFunction) => {
  console.log(`${req.method} ${req.path}`, {
    headers: req.headers,
    user: req.user,
    body: req.body
  });
  next();
};
```

#### 3. Performance Issues
```typescript
// Add performance timing
const startTime = Date.now();
const result = await someExpensiveOperation();
const duration = Date.now() - startTime;

logger.info('Operation completed', {
  operation: 'someExpensiveOperation',
  duration,
  timestamp: new Date().toISOString()
});
```

### Development Tools

#### VS Code Extensions
- TypeScript and JavaScript Language Features
- Prisma Extension
- ESLint Extension
- Prettier Extension
- REST Client Extension

#### Debugging Configuration
```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Node.js",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/src/server.ts",
      "outFiles": ["${workspaceFolder}/dist/**/*.js"],
      "env": {
        "NODE_ENV": "development"
      },
      "runtimeArgs": ["-r", "ts-node/register"]
    }
  ]
}
```

This developer guide provides comprehensive information for contributing to and maintaining the Clients+ backend system. Keep this guide updated as the project evolves.