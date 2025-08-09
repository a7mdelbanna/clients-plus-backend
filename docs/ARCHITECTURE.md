# System Architecture Documentation

## Overview

The Clients+ system employs a modern, scalable microservices-inspired architecture built on Express.js with TypeScript, designed for multi-tenant SaaS operations. This document provides a comprehensive overview of the system architecture, design decisions, and technical implementation details.

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                 Client Layer                                    │
├─────────────────┬─────────────────┬─────────────────┬─────────────────────────────┤
│   Dashboard     │   Booking App   │   Mobile Apps   │    Third-party Clients      │
│   (React SPA)   │   (React SPA)   │ (React Native)  │     (API Consumers)         │
│   Port: 3001    │   Port: 3002    │   Native Apps   │      (Webhooks)             │
└─────────────────┴─────────────────┴─────────────────┴─────────────────────────────┘
                                          │
                                   ┌──────▼──────┐
                                   │     CDN     │
                                   │  (Cloudflare│
                                   │   /AWS CF)  │
                                   └──────┬──────┘
                                          │
                          ┌───────────────▼───────────────┐
                          │         Load Balancer         │
                          │       (Nginx/HAProxy)         │
                          │     SSL Termination           │
                          │     Rate Limiting             │
                          └───────────────┬───────────────┘
                                          │
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                API Gateway Layer                                │
├─────────────────┬─────────────────┬─────────────────┬─────────────────────────────┤
│  Authentication │   Rate Limiting │   Request Log   │     CORS & Security         │
│   Middleware    │   Middleware    │   Middleware    │      Middleware             │
└─────────────────┴─────────────────┴─────────────────┴─────────────────────────────┘
                                          │
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              Express.js Application                             │
├─────────────────┬─────────────────┬─────────────────┬─────────────────────────────┤
│   Controllers   │    Services     │   WebSocket     │     Background Jobs         │
│   (HTTP Logic)  │ (Business Logic)│   Server        │     (Cron/Queue)            │
│                 │                 │  (Socket.IO)    │                             │
│   • Auth        │  • Auth         │                 │  • Notifications            │
│   • Clients     │  • Clients      │  Real-time:     │  • Email/SMS                │
│   • Staff       │  • Staff        │  • Appointments │  • Report Generation        │
│   • Services    │  • Services     │  • Notifications│  • Data Cleanup             │
│   • Appointments│  • Appointments │  • Staff Updates│  • Backups                  │
│   • Invoices    │  • Invoices     │  • Client Chat  │                             │
│   • Analytics   │  • Analytics    │                 │                             │
└─────────────────┴─────────────────┴─────────────────┴─────────────────────────────┘
                                          │
    ┌─────────────────┬─────────────────┬─────────────────┬─────────────────────────┐
    │                 │                 │                 │                         │
┌───▼────┐    ┌──────▼──────┐   ┌──────▼──────┐   ┌─────▼─────────────────────────┐
│PostreSQL│    │    Redis    │   │   File      │   │      External Services       │
│Database │    │   Cache     │   │  Storage    │   │                               │
│         │    │ & Sessions  │   │   (AWS S3/  │   │  • WhatsApp API               │
│• Users  │    │             │   │   Local)    │   │  • SMS Gateway (Twilio)       │
│• Clients│    │• Session    │   │             │   │  • Email (SMTP/SendGrid)      │
│• Appts  │    │  Store      │   │• Invoices   │   │  • Payment Gateway            │
│• Staff  │    │• API Cache  │   │• Reports    │   │  • Analytics (Google)         │
│• Company│    │• Real-time  │   │• Backups    │   │  • Monitoring (DataDog)       │
│• Services│   │  Messages   │   │• Uploads    │   │  • Logging (ELK Stack)        │
│• Invoices│   │• Queue Jobs │   │             │   │                               │
└─────────┘    └─────────────┘   └─────────────┘   └───────────────────────────────┘
```

## Architectural Principles

### 1. Multi-Tenant SaaS Architecture

The system is designed as a multi-tenant SaaS platform where each company (tenant) has complete data isolation while sharing the same application infrastructure.

**Tenant Isolation Strategy:**
```typescript
// Every database query includes company context
const appointments = await prisma.appointment.findMany({
  where: {
    companyId: req.user.companyId, // Automatic tenant filtering
    date: requestedDate
  }
});

// JWT tokens carry company context
interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  companyId: string; // Tenant identifier
  exp: number;
}
```

### 2. Domain-Driven Design (DDD)

The application is organized around business domains with clear boundaries and responsibilities.

**Domain Boundaries:**
```
Authentication Domain  →  User management, JWT, permissions
Client Domain         →  Customer data, profiles, preferences  
Appointment Domain    →  Booking, scheduling, availability
Staff Domain          →  Employee management, schedules
Invoice Domain        →  Billing, payments, financial records
Notification Domain   →  Multi-channel communication
Analytics Domain      →  Reports, insights, business intelligence
```

### 3. Layered Architecture

```
┌─────────────────────────────────────┐
│          Presentation Layer         │
│  (Controllers, Routes, Middleware)  │
└─────────────────┬───────────────────┘
                  │
┌─────────────────▼───────────────────┐
│          Business Layer             │
│     (Services, Domain Logic)        │
└─────────────────┬───────────────────┘
                  │
┌─────────────────▼───────────────────┐
│          Data Access Layer          │
│      (Prisma ORM, Repositories)     │
└─────────────────┬───────────────────┘
                  │
┌─────────────────▼───────────────────┐
│            Database Layer           │
│        (PostgreSQL, Redis)          │
└─────────────────────────────────────┘
```

## Core Components

### 1. Authentication & Authorization System

#### JWT-Based Authentication
```typescript
// JWT Structure
{
  "userId": "user-uuid",
  "email": "user@company.com", 
  "role": "ADMIN|MANAGER|STAFF|USER",
  "companyId": "company-uuid",
  "permissions": ["READ_CLIENTS", "WRITE_APPOINTMENTS"],
  "iat": 1691234567,
  "exp": 1691320967
}

// Role-Based Access Control (RBAC)
enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',  // Platform administration
  ADMIN = 'ADMIN',              // Company administration
  MANAGER = 'MANAGER',          // Branch management
  STAFF = 'STAFF',              // Service providers
  USER = 'USER'                 // Basic system users
}

// Permission-Based Authorization
const permissions = {
  'READ_CLIENTS': ['ADMIN', 'MANAGER', 'STAFF'],
  'WRITE_CLIENTS': ['ADMIN', 'MANAGER'],
  'DELETE_CLIENTS': ['ADMIN'],
  'READ_APPOINTMENTS': ['ADMIN', 'MANAGER', 'STAFF'],
  'WRITE_APPOINTMENTS': ['ADMIN', 'MANAGER', 'STAFF'],
  'READ_ANALYTICS': ['ADMIN', 'MANAGER']
};
```

#### Multi-Tenant Security Middleware
```typescript
export const tenantMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  // Automatically inject company context into all queries
  req.prisma = prisma.$extends({
    query: {
      $allModels: {
        async findMany({ args, query }) {
          args.where = { ...args.where, companyId: req.user.companyId };
          return query(args);
        }
      }
    }
  });
  next();
};
```

### 2. Data Layer Architecture

#### Database Schema Design
```sql
-- Core entity relationships
Companies (1) ←→ (N) Users
Companies (1) ←→ (N) Branches  
Companies (1) ←→ (N) Clients
Companies (1) ←→ (N) Staff
Companies (1) ←→ (N) Services
Companies (1) ←→ (N) Appointments
Appointments (N) ←→ (1) Clients
Appointments (N) ←→ (1) Staff  
Appointments (N) ←→ (N) Services (many-to-many)
Invoices (1) ←→ (N) Appointments
```

#### Prisma Schema Structure
```prisma
model Company {
  id          String   @id @default(cuid())
  name        String
  subdomain   String   @unique
  settings    Json?
  
  // Multi-tenant relationships
  users       User[]
  branches    Branch[]
  clients     Client[]
  staff       Staff[]
  services    Service[]
  appointments Appointment[]
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Appointment {
  id          String            @id @default(cuid())
  companyId   String            // Tenant isolation
  clientId    String
  staffId     String?
  branchId    String
  
  // Scheduling fields
  date        DateTime
  startTime   String
  endTime     String
  duration    Int               // Duration in minutes
  status      AppointmentStatus @default(PENDING)
  
  // Relations with proper indexing
  company     Company @relation(fields: [companyId], references: [id])
  client      Client  @relation(fields: [clientId], references: [id])
  staff       Staff?  @relation(fields: [staffId], references: [id])
  branch      Branch  @relation(fields: [branchId], references: [id])
  
  // Performance indexes
  @@index([companyId, date, status])
  @@index([staffId, date])
  @@index([clientId])
  @@index([branchId, date])
}
```

#### Database Performance Optimization
```sql
-- Strategic indexes for common queries
CREATE INDEX CONCURRENTLY idx_appointments_availability_lookup 
ON appointments(company_id, branch_id, date, staff_id) 
WHERE status IN ('CONFIRMED', 'IN_PROGRESS');

CREATE INDEX CONCURRENTLY idx_clients_search 
ON clients USING gin(to_tsvector('english', name || ' ' || email || ' ' || phone));

CREATE INDEX CONCURRENTLY idx_staff_schedule 
ON staff_schedules(staff_id, date) 
INCLUDE (start_time, end_time, is_available);
```

### 3. Business Logic Layer (Services)

#### Service Architecture Pattern
```typescript
// Base service with common functionality
export abstract class BaseService<T> {
  constructor(protected prisma: PrismaClient) {}
  
  protected async validateCompanyAccess(entityId: string, companyId: string): Promise<void> {
    // Ensure entity belongs to user's company
  }
  
  protected async logActivity(action: string, entityId: string, userId: string): Promise<void> {
    // Activity logging for audit trails
  }
}

// Domain-specific service implementation
export class AppointmentService extends BaseService<Appointment> {
  async createAppointment(data: AppointmentInput, userId: string): Promise<string> {
    // 1. Validation
    await this.validateAppointmentData(data);
    
    // 2. Availability check
    await this.checkAvailability(data.staffId, data.date, data.startTime, data.duration);
    
    // 3. Business logic
    const appointment = await this.prisma.appointment.create({
      data: {
        ...data,
        status: 'CONFIRMED',
        createdBy: userId
      }
    });
    
    // 4. Side effects
    await this.sendConfirmationNotification(appointment.id);
    await this.updateStaffAvailability(data.staffId, data.date);
    
    // 5. Event emission
    EventBus.emit('appointment.created', appointment);
    
    // 6. Activity logging
    await this.logActivity('CREATE', appointment.id, userId);
    
    return appointment.id;
  }
}
```

### 4. Real-time Communication Architecture

#### WebSocket Implementation with Socket.IO
```typescript
// WebSocket server setup
class WebSocketServer {
  private io: Server;
  
  constructor(httpServer: HttpServer) {
    this.io = new Server(httpServer, {
      cors: { origin: process.env.ALLOWED_ORIGINS?.split(',') },
      transports: ['websocket', 'polling']
    });
    
    this.setupAuthentication();
    this.setupRooms();
    this.setupEventHandlers();
  }
  
  private setupAuthentication() {
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
        
        socket.userId = decoded.userId;
        socket.companyId = decoded.companyId;
        socket.role = decoded.role;
        
        next();
      } catch (error) {
        next(new Error('Authentication failed'));
      }
    });
  }
  
  private setupRooms() {
    this.io.on('connection', (socket) => {
      // Join company-specific room for tenant isolation
      socket.join(`company:${socket.companyId}`);
      
      // Join user-specific room for personal notifications
      socket.join(`user:${socket.userId}`);
      
      // Join role-specific rooms
      socket.join(`role:${socket.role}:${socket.companyId}`);
    });
  }
}

// Event emission from business services
export class AppointmentService {
  async completeAppointment(id: string, userId: string): Promise<void> {
    const appointment = await this.updateAppointmentStatus(id, 'COMPLETED');
    
    // Emit real-time updates
    this.webSocketServer.emit(`company:${appointment.companyId}`, 'appointment.completed', {
      appointmentId: id,
      appointment: appointment
    });
    
    // Notify specific staff member
    this.webSocketServer.emit(`user:${appointment.staffId}`, 'appointment.completed', {
      message: 'Appointment completed successfully'
    });
  }
}
```

### 5. API Architecture

#### RESTful API Design
```typescript
// Consistent API structure
/api/v1/
├── /auth                    # Authentication endpoints
│   ├── POST /login          # User login
│   ├── POST /register       # User registration
│   ├── POST /refresh        # Token refresh
│   └── GET  /me             # Current user info
├── /companies               # Company management
├── /users                   # User management
├── /clients                 # Client management
├── /staff                   # Staff management
├── /services                # Service catalog
├── /appointments            # Appointment booking
├── /invoices                # Invoice management
├── /analytics               # Business analytics
├── /notifications           # Notification system
└── /public/:companyId       # Public booking APIs
    ├── /availability        # Public availability
    ├── /booking            # Public booking
    └── /services           # Public service catalog
```

#### API Response Standardization
```typescript
// Standard success response
interface APISuccessResponse<T> {
  success: true;
  data: T;
  message: string;
  timestamp: string;
  pagination?: PaginationMeta;
}

// Standard error response  
interface APIErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
}

// Pagination structure
interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}
```

## Data Flow Architecture

### 1. Request Processing Flow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Client    │───▶│   Nginx     │───▶│ Express.js  │───▶│ Controller  │
│ Application │    │Load Balancer│    │    App      │    │   Layer     │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                                             │                     │
                                             ▼                     ▼
                                   ┌─────────────┐    ┌─────────────┐
                                   │ Middleware  │───▶│  Service    │
                                   │   Stack     │    │   Layer     │
                                   └─────────────┘    └─────────────┘
                                             │                     │
                                             ▼                     ▼
                                   ┌─────────────┐    ┌─────────────┐
                                   │  WebSocket  │    │  Database   │
                                   │   Events    │    │  Operations │
                                   └─────────────┘    └─────────────┘
```

### 2. Middleware Stack Processing

```typescript
// Request processing pipeline
const middlewareStack = [
  helmet(),                    // Security headers
  cors(),                     // CORS policy
  rateLimitMiddleware,        // Rate limiting
  loggingMiddleware,          // Request logging
  authMiddleware,             // Authentication
  tenantMiddleware,           // Multi-tenant context
  validationMiddleware,       // Request validation
  businessLogicHandler,       // Route handler
  errorHandlerMiddleware      // Error handling
];
```

### 3. Event-Driven Architecture

```typescript
// Event bus for loose coupling
export class EventBus {
  private static instance: EventEmitter;
  
  static emit(event: string, data: any): void {
    this.getInstance().emit(event, data);
  }
  
  static on(event: string, handler: Function): void {
    this.getInstance().on(event, handler);
  }
}

// Event handlers for side effects
EventBus.on('appointment.created', async (appointment) => {
  await NotificationService.sendConfirmation(appointment);
  await CalendarService.syncToExternalCalendar(appointment);
  await AnalyticsService.trackAppointmentCreated(appointment);
});

EventBus.on('invoice.paid', async (invoice) => {
  await EmailService.sendReceipt(invoice);
  await AccountingService.recordPayment(invoice);
  await LoyaltyService.awardPoints(invoice.clientId, invoice.total);
});
```

## Security Architecture

### 1. Authentication Security

```typescript
// JWT Security Implementation
class JWTService {
  private static readonly ALGORITHM = 'HS256';
  private static readonly EXPIRES_IN = '24h';
  private static readonly REFRESH_EXPIRES_IN = '7d';
  
  static generateTokenPair(user: User): TokenPair {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
      permissions: user.permissions
    };
    
    const accessToken = jwt.sign(payload, process.env.JWT_SECRET!, {
      expiresIn: this.EXPIRES_IN,
      algorithm: this.ALGORITHM
    });
    
    const refreshToken = jwt.sign(
      { userId: user.id, tokenType: 'refresh' },
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn: this.REFRESH_EXPIRES_IN }
    );
    
    return { accessToken, refreshToken };
  }
}
```

### 2. Data Security Measures

```typescript
// Input validation and sanitization
const sanitizeInput = (input: any): any => {
  if (typeof input === 'string') {
    return validator.escape(input.trim());
  }
  if (Array.isArray(input)) {
    return input.map(sanitizeInput);
  }
  if (typeof input === 'object' && input !== null) {
    const sanitized: any = {};
    Object.keys(input).forEach(key => {
      sanitized[key] = sanitizeInput(input[key]);
    });
    return sanitized;
  }
  return input;
};

// SQL injection prevention (via Prisma)
// Prisma automatically prevents SQL injection through parameterized queries
const appointments = await prisma.appointment.findMany({
  where: {
    companyId: req.user.companyId, // Safe parameter binding
    date: {
      gte: new Date(startDate)     // Type-safe date handling
    }
  }
});
```

### 3. API Security Headers

```typescript
// Security middleware configuration
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Rate limiting
const createRateLimit = (windowMs: number, max: number) => rateLimit({
  windowMs,
  max,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Different limits for different endpoints
app.use('/api/v1/auth/login', createRateLimit(15 * 60 * 1000, 5));  // 5 requests per 15 minutes
app.use('/api/v1/', createRateLimit(60 * 1000, 100));                // 100 requests per minute
```

## Performance Architecture

### 1. Caching Strategy

```typescript
// Multi-layer caching architecture
class CacheService {
  private redis: Redis;
  private memoryCache: NodeCache;
  
  async get(key: string): Promise<any> {
    // 1. Check memory cache (L1)
    const memoryResult = this.memoryCache.get(key);
    if (memoryResult) return memoryResult;
    
    // 2. Check Redis cache (L2)
    const redisResult = await this.redis.get(key);
    if (redisResult) {
      const parsed = JSON.parse(redisResult);
      this.memoryCache.set(key, parsed, 60); // Cache in memory for 1 minute
      return parsed;
    }
    
    return null;
  }
  
  async set(key: string, value: any, ttl: number): Promise<void> {
    // Set in both caches
    this.memoryCache.set(key, value, Math.min(ttl, 300)); // Max 5 minutes in memory
    await this.redis.setex(key, ttl, JSON.stringify(value));
  }
}

// Cache implementation in services
export class AvailabilityService {
  async getAvailableSlots(branchId: string, date: Date): Promise<TimeSlot[]> {
    const cacheKey = `availability:${branchId}:${date.toISOString().split('T')[0]}`;
    
    // Check cache first
    const cached = await CacheService.get(cacheKey);
    if (cached) return cached;
    
    // Calculate availability
    const slots = await this.calculateAvailability(branchId, date);
    
    // Cache for 5 minutes
    await CacheService.set(cacheKey, slots, 300);
    
    return slots;
  }
}
```

### 2. Database Performance

```typescript
// Connection pooling configuration
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: `${process.env.DATABASE_URL}?connection_limit=20&pool_timeout=60`
    }
  },
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'warn' }
  ]
});

// Query optimization techniques
class DatabaseOptimizer {
  // Use database functions for complex calculations
  async getAppointmentStats(companyId: string): Promise<AppointmentStats> {
    return await prisma.$queryRaw`
      SELECT 
        COUNT(*) as total_appointments,
        COUNT(*) FILTER (WHERE status = 'COMPLETED') as completed_appointments,
        AVG(duration) as avg_duration,
        DATE_TRUNC('day', date) as appointment_date
      FROM appointments 
      WHERE company_id = ${companyId}
        AND date >= NOW() - INTERVAL '30 days'
      GROUP BY DATE_TRUNC('day', date)
      ORDER BY appointment_date DESC
    `;
  }
  
  // Batch operations for bulk updates
  async updateMultipleAppointments(appointmentIds: string[], updates: any): Promise<void> {
    await prisma.$transaction(
      appointmentIds.map(id => 
        prisma.appointment.update({
          where: { id },
          data: updates
        })
      )
    );
  }
}
```

## Scalability Architecture

### 1. Horizontal Scaling Strategy

```yaml
# Kubernetes deployment configuration
apiVersion: apps/v1
kind: Deployment
metadata:
  name: clients-plus-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: clients-plus-api
  template:
    spec:
      containers:
      - name: api
        image: clients-plus-api:latest
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi" 
            cpu: "500m"
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: database-secret
              key: url

---
apiVersion: v1
kind: Service
metadata:
  name: clients-plus-api-service
spec:
  selector:
    app: clients-plus-api
  ports:
  - port: 3000
    targetPort: 3000
  type: LoadBalancer
```

### 2. Database Scaling

```typescript
// Read/Write database splitting
class DatabaseService {
  private writeConnection: PrismaClient;
  private readConnections: PrismaClient[];
  
  constructor() {
    this.writeConnection = new PrismaClient({
      datasources: { db: { url: process.env.DATABASE_WRITE_URL } }
    });
    
    this.readConnections = [
      new PrismaClient({
        datasources: { db: { url: process.env.DATABASE_READ_REPLICA_1_URL } }
      }),
      new PrismaClient({
        datasources: { db: { url: process.env.DATABASE_READ_REPLICA_2_URL } }
      })
    ];
  }
  
  getReadConnection(): PrismaClient {
    // Simple round-robin load balancing
    const index = Math.floor(Math.random() * this.readConnections.length);
    return this.readConnections[index];
  }
  
  getWriteConnection(): PrismaClient {
    return this.writeConnection;
  }
}

// Usage in services
export class AppointmentService {
  async getAppointments(filter: AppointmentFilter): Promise<Appointment[]> {
    // Use read replica for queries
    const db = DatabaseService.getReadConnection();
    return await db.appointment.findMany({ where: filter });
  }
  
  async createAppointment(data: AppointmentInput): Promise<string> {
    // Use primary database for writes
    const db = DatabaseService.getWriteConnection();
    const appointment = await db.appointment.create({ data });
    return appointment.id;
  }
}
```

## Monitoring and Observability

### 1. Application Performance Monitoring

```typescript
// Custom metrics collection
import { register, Counter, Histogram, Gauge } from 'prom-client';

const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status_code', 'company_id']
});

const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration',
  labelNames: ['method', 'route'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

const activeConnections = new Gauge({
  name: 'websocket_connections_active',
  help: 'Active WebSocket connections',
  labelNames: ['company_id']
});

// Metrics middleware
export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - startTime) / 1000;
    
    httpRequestsTotal.inc({
      method: req.method,
      route: req.route?.path || req.path,
      status_code: res.statusCode.toString(),
      company_id: req.user?.companyId || 'anonymous'
    });
    
    httpRequestDuration.observe({
      method: req.method,
      route: req.route?.path || req.path
    }, duration);
  });
  
  next();
};
```

### 2. Health Check System

```typescript
// Comprehensive health check
export class HealthCheckService {
  async getSystemHealth(): Promise<HealthStatus> {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkExternalServices(),
      this.checkSystemResources()
    ]);
    
    const health: HealthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version,
      uptime: process.uptime(),
      checks: {
        database: this.getCheckResult(checks[0]),
        redis: this.getCheckResult(checks[1]),
        external_services: this.getCheckResult(checks[2]),
        system_resources: this.getCheckResult(checks[3])
      }
    };
    
    // Determine overall health
    const hasFailures = Object.values(health.checks).some(check => check.status === 'unhealthy');
    health.status = hasFailures ? 'unhealthy' : 'healthy';
    
    return health;
  }
  
  private async checkDatabase(): Promise<HealthCheck> {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { status: 'healthy', responseTime: Date.now() };
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  }
}
```

This architecture documentation provides a comprehensive overview of the system design, enabling developers and architects to understand the technical foundation and make informed decisions about future enhancements.