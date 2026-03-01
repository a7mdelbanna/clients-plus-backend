# Clients+ Backend — Project Guide

## What Is This?

**Clients+** is a multi-tenant SaaS platform for barbershops/salons to manage their entire business — clients, appointments, staff, inventory, invoicing, POS sales, and financial reporting. It has three frontend apps (dashboard, booking-app) and this backend API.

## Migration History: Firebase → PostgreSQL/Prisma

This project was originally built on **Firebase/Firestore** as the database and auth layer. It has been **fully migrated** to:

- **PostgreSQL** as the primary database
- **Prisma ORM** for schema management, migrations, and queries
- **JWT-based auth** (custom, replacing Firebase Auth)
- **Express.js + TypeScript** API server

The `firebase-admin` package is still in `package.json` but is **no longer the primary data layer**. All business logic now goes through Prisma. Firebase may still be referenced in some notification/push notification code but the core data operations are all Prisma/PostgreSQL.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js >= 18 |
| Language | TypeScript 5.4 |
| Framework | Express 4.19 |
| Database | PostgreSQL (via Prisma 5.12) |
| Cache/Queue | Redis + Bull |
| Auth | JWT (jsonwebtoken) |
| Validation | Zod, class-validator, express-validator |
| File Storage | AWS S3 |
| Notifications | Twilio (WhatsApp/SMS), Nodemailer (email) |
| Real-time | Socket.io |
| Docs | Swagger (swagger-jsdoc + swagger-ui-express) |
| PDF/Reports | PDFKit, ExcelJS, csv-writer |
| Testing | Jest (unit), custom E2E flow runner |

## Project Structure

```
clients-plus-backend/
├── dashboard/                     # React frontend (see Dashboard section below)
│   ├── src/
│   │   ├── components/            # Reusable UI components
│   │   ├── pages/                 # Page-level components (route targets)
│   │   ├── services/              # API service layer (axios calls to backend)
│   │   ├── contexts/              # React contexts (auth, theme, i18n)
│   │   ├── hooks/                 # Custom React hooks
│   │   ├── types/                 # TypeScript type definitions
│   │   ├── utils/                 # Shared utilities
│   │   └── i18n/                  # Internationalization (en/ar)
│   ├── package.json
│   └── vite.config.ts
├── prisma/
│   └── schema.prisma              # Full DB schema (30+ models)
├── src/
│   ├── app.ts                     # Express app setup, middleware, route mounting
│   ├── server.ts                  # Server entry point
│   ├── config/                    # DB, env, logger config
│   ├── controllers/               # Route handlers (one per domain)
│   ├── services/                  # Business logic (one per domain)
│   ├── routes/                    # Express routers (one per domain)
│   ├── middleware/                 # Auth, error handling, validation, rate limiting
│   ├── types/                     # TypeScript type definitions
│   ├── utils/                     # Shared utilities
│   ├── cron/                      # Scheduled jobs
│   ├── websocket/                 # Socket.io setup
│   └── templates/                 # Email/notification templates
├── tests/
│   ├── e2e-flows/
│   │   └── run-all-flows.mjs      # 30 E2E business flow tests (main test suite)
│   ├── e2e/                       # Older E2E tests
│   ├── unit/                      # Unit tests
│   ├── integration/               # Integration tests
│   ├── security/                  # Security tests
│   └── performance/               # Performance tests
└── CLAUDE.md                      # This file
```

## API Domains (Routes)

All API routes are mounted at `/api/v1/<domain>`:

| Domain | Route File | Description |
|--------|-----------|-------------|
| Auth | `auth.routes.ts` | Login, register, token refresh, password reset |
| Clients | `client.routes.ts` | CRUD, categories, visit history |
| Appointments | `appointment.routes.ts` | CRUD, status lifecycle, availability, conflicts, analytics |
| Recurring | `recurring.routes.ts` | Recurring appointment series (sub-route of appointments) |
| Staff | `staff.routes.ts` | CRUD, schedules, services, commissions, performance |
| Services | `service.routes.ts` | Salon/barber services CRUD |
| Branches | `branch.routes.ts` | Multi-branch management |
| Products | `product.routes.ts` | Product CRUD |
| Product Categories | `product-category.routes.ts` | Product categorization |
| Client Categories | `client-category.routes.ts` | Client categorization |
| Inventory | `inventory.routes.ts` | Stock levels, movements, adjustments, alerts, valuation |
| Sales (POS) | `sale.routes.ts` | Point-of-sale transactions, receipts, refunds |
| Register | `register.routes.ts` | Cash register open/close, cash drops, summaries |
| Invoices | `invoice.routes.ts` | Invoice CRUD, payments, outstanding, overdue |
| Financial | `financial.routes.ts` | Expenses, profit-loss, financial reports |
| Analytics | `analytics.routes.ts` | Business analytics, charts, trends |
| Reports | `reports.routes.ts` | PDF/Excel report generation |
| Dashboard | `dashboard.routes.ts` | Dashboard stats and summaries |
| Public | `public.routes.ts` | Unauthenticated booking endpoints |
| Setup | `setup.routes.ts` | First-time company setup wizard |
| Company | `company.routes.ts` | Company profile management |
| Users | `user.routes.ts` | User management |
| Notifications | `notification.routes.ts` | Push/SMS/email notifications |
| WhatsApp | `whatsapp.routes.ts` | WhatsApp messaging integration |
| Settings | `settings.routes.ts` | App settings |
| Upload | `upload.routes.ts` | File upload (S3) |
| Health | `health.routes.ts` | Health/readiness/liveness checks |

## Key Prisma Models

The schema has 30+ models. Core ones:

- **Company** — Tenant (multi-tenant via companyId on every model)
- **User** — Auth users (owners, admins)
- **Client** — Customers of the barbershop
- **Staff** — Barbers/stylists with schedules, services, commissions
- **Service** — Haircut, beard trim, etc. with duration and pricing
- **Appointment** — Core booking entity with full status lifecycle
- **RecurringAppointment** — Recurring series (weekly, biweekly, monthly)
- **Branch** — Physical locations
- **Product / ProductCategory** — Retail products for sale
- **InventoryItem / InventoryMovement** — Stock tracking
- **Sale / SaleItem** — POS transactions
- **CashRegisterDay / CashOperation** — Daily register management
- **Invoice / InvoiceItem / Payment** — Billing and payments
- **Expense / Budget** — Financial tracking
- **Notification** — In-app and external notifications

## Appointment Status Lifecycle

```
PENDING → CONFIRMED → ARRIVED → IN_PROGRESS → COMPLETED
                                              → NO_SHOW
                   → CANCELLED
                   → RESCHEDULED (creates new appointment)
```

## Running the Project

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Start dev server (default port 3000, or set PORT env)
npm run dev

# Or with specific port
PORT=3006 npx ts-node src/server.ts
```

## Running Tests

### E2E Flow Tests (Primary Test Suite)

```bash
# Backend must be running first (on port 3005 or 3006)
# The test file auto-detects which port is active
node tests/e2e-flows/run-all-flows.mjs
```

**Current status: 30 flows, 313 pass, 0 fail, 3 skip**

The E2E flow tests are the primary quality gate. They test:
- **Flows 1-19**: Individual domain CRUD (clients, staff, services, branches, appointments, invoices, inventory, products, sales, register, analytics, financial, dashboard, public booking, recurring, notifications, settings, users, reports)
- **Flows 20-30**: Cross-domain business scenarios:
  - Flow 20: Full appointment lifecycle (book → confirm → arrive → service → complete → invoice → pay)
  - Flow 21: Walk-in POS sale (product + service → cash register → inventory deduction → receipt → refund)
  - Flow 22: Online public booking flow
  - Flow 23: Scheduling conflicts and staff availability
  - Flow 24: Invoice lifecycle with partial payments
  - Flow 25: Staff management and commission tracking
  - Flow 26: Inventory and product lifecycle
  - Flow 27: Appointment rescheduling, cancellation, and no-shows
  - Flow 28: Multi-branch operations
  - Flow 29: Recurring appointments
  - Flow 30: End-of-day register reconciliation

### Unit/Integration Tests

```bash
npm test              # Run Jest tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

## Backend Bugs Fixed During E2E Testing

These were found and fixed during the cross-domain E2E test development:

1. **Express route ordering** (`appointment.routes.ts`): Named routes like `/analytics`, `/conflicts`, `/statistics/no-shows` were placed AFTER `/:id`, so Express matched "analytics" as an appointment ID. Fixed by moving all named routes before `/:id`.

2. **changeHistory spread crash** (`appointment.service.ts`): The `changeHistory` Prisma JsonValue field was spread with `...((field) || [])` but JsonValue isn't guaranteed to be an array. Fixed with `Array.isArray()` guard.

## Dashboard Frontend

The `dashboard/` directory contains the admin dashboard — a React SPA that consumes the backend API.

### Dashboard Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 |
| Build Tool | Vite 7 |
| Language | TypeScript 5.8 |
| UI Library | MUI (Material UI) 7 |
| Routing | React Router 7 |
| Forms | React Hook Form + Yup |
| HTTP Client | Axios |
| Charts | ECharts, Recharts |
| i18n | i18next (English + Arabic with RTL) |
| State | React Context |
| Real-time | Socket.io Client |
| Animations | Framer Motion |

### Running the Dashboard

```bash
cd dashboard
cp .env.example .env     # Configure API URL and feature flags
npm install
npm run dev              # Starts Vite dev server (default port 5173)
```

The dashboard expects the backend to be running (default `http://localhost:3005/api/v1`). Configure `VITE_API_URL` in `dashboard/.env`.

### Dashboard Environment Variables

See `dashboard/.env.example` for all available variables. Key ones:
- `VITE_API_URL` — Backend API base URL
- `VITE_FORCE_EXPRESS_MODE` — Use Express/Prisma backend (set to `true`)
- `VITE_USE_WEBSOCKET` — Enable WebSocket real-time updates
- `VITE_ENABLE_CACHING` — Enable client-side caching

### Dashboard ↔ Backend Relationship

- The dashboard is a **standalone SPA** — it communicates with the backend exclusively via REST API calls
- API service files in `dashboard/src/services/` map to backend routes at `/api/v1/<domain>`
- Auth tokens (JWT) are stored client-side and sent via `Authorization: Bearer` header
- The dashboard has feature flags (`VITE_USE_EXPRESS_*`) to toggle between Express backend and legacy Firebase (all should be `true`)

## What Still Needs To Be Done

### High Priority
- [ ] **Frontend-backend integration testing** — The dashboard and booking-app frontends need to be tested against this backend
- [ ] **Authentication hardening** — Rate limiting on auth endpoints, refresh token rotation, session management
- [ ] **Multi-tenant isolation audit** — Verify every query filters by `companyId` to prevent cross-tenant data leaks
- [ ] **Public booking validation** — The public booking endpoint (`POST /public/booking`) needs stricter input validation
- [ ] **Subscription/plan enforcement** — Branch creation and other features should be gated by the company's subscription plan (currently partially implemented)

### Medium Priority
- [ ] **Redis integration** — Redis is configured but may not be running in all environments; add graceful fallback
- [ ] **Queue processing (Bull)** — Background job processing for notifications, reports — needs testing
- [ ] **File upload (S3)** — S3 integration exists but needs configuration validation
- [ ] **WhatsApp/Twilio integration** — Routes exist but need real credentials and testing
- [ ] **WebSocket real-time updates** — Socket.io is set up but client integration incomplete
- [ ] **Cron jobs** — Scheduled tasks (reminder notifications, no-show detection) need verification

### Low Priority
- [ ] **Remove Firebase dependency** — `firebase-admin` is still in package.json; clean up any remaining references
- [ ] **API documentation** — Swagger is set up but not all endpoints have swagger annotations
- [ ] **Performance testing** — Load tests exist in `tests/performance/` but haven't been validated recently
- [ ] **CI/CD pipeline** — No GitHub Actions or deployment pipeline configured yet
- [ ] **Docker setup** — docker-compose exists but needs validation
- [ ] **Cleanup .bak files** — Several `.bak` route/controller/service files should be removed once confirmed unnecessary

## Environment Variables

Required in `.env`:
```
DATABASE_URL=postgresql://user:password@localhost:5432/clients_plus
JWT_SECRET=your-jwt-secret
PORT=3000
NODE_ENV=development
```

Optional:
```
REDIS_URL=redis://localhost:6379
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=...
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
SMTP_HOST=...
SMTP_USER=...
SMTP_PASS=...
```

## Conventions

- **Controller → Service → Prisma** layered architecture
- Every model has `companyId` for multi-tenant isolation
- Routes are in `src/routes/`, controllers in `src/controllers/`, services in `src/services/`
- Named routes MUST come before parameterized `/:id` routes in Express routers
- Auth middleware (`authenticateToken`) is applied per-router, not globally
- Date handling uses `date-fns` library
- Validation uses a mix of Zod, class-validator, and express-validator (not fully standardized)
