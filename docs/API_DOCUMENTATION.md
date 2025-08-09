# Clients+ API Documentation
## Complete Firebase to Express Migration - 100+ Endpoints

## Base URL
```
Development: http://localhost:3000/api/v1
Production: https://api.clients-plus.com/api/v1
```

## Authentication
All endpoints require JWT authentication except public endpoints and health checks.

### Headers
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
X-Company-ID: <company_uuid> (Optional - for multi-tenant context)
```

### Authentication Flow
1. **Login**: POST `/auth/login`
2. **Verify Token**: GET `/auth/me`
3. **Refresh Token**: POST `/auth/refresh`
4. **Company Registration**: POST `/auth/register-company`
5. **User Registration**: POST `/auth/register`

## Response Format

### Success Response
```json
{
  "data": {},
  "message": "Success message",
  "timestamp": "2024-03-15T10:30:00Z"
}
```

### Error Response
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {}
  },
  "timestamp": "2024-03-15T10:30:00Z"
}
```

## Endpoints

### Health Check
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/health` | System health status | No |

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-03-15T10:30:00Z",
  "services": {
    "database": "connected",
    "redis": "connected"
  },
  "version": "1.0.0"
}
```

### Authentication
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/auth/login` | User login | No |
| GET | `/auth/me` | Get current user | Yes |
| POST | `/auth/logout` | User logout | Yes |

#### POST /auth/login
**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "companyId": "company_uuid"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "user_uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "ADMIN",
    "companyId": "company_uuid"
  }
}
```

### Companies
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/companies` | List companies | Admin |
| GET | `/companies/:id` | Get company details | Yes |
| POST | `/companies` | Create company | Super Admin |
| PUT | `/companies/:id` | Update company | Admin |
| DELETE | `/companies/:id` | Delete company | Super Admin |

#### GET /companies/:id
**Response:**
```json
{
  "id": "company_uuid",
  "name": "Company Name",
  "email": "contact@company.com",
  "phone": "+1234567890",
  "address": "123 Business St",
  "settings": {
    "timezone": "America/New_York",
    "currency": "USD",
    "dateFormat": "MM/DD/YYYY"
  },
  "subscription": {
    "plan": "PRO",
    "status": "ACTIVE",
    "expiresAt": "2024-12-31T23:59:59Z"
  },
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-03-15T10:30:00Z"
}
```

### Users
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/users` | List company users | Admin |
| GET | `/users/:id` | Get user details | Yes |
| POST | `/users` | Create user | Admin |
| PUT | `/users/:id` | Update user | Admin |
| DELETE | `/users/:id` | Delete user | Admin |

#### POST /users
**Request:**
```json
{
  "email": "newuser@example.com",
  "name": "New User",
  "role": "STAFF",
  "password": "tempPassword123",
  "permissions": ["READ_CLIENTS", "WRITE_APPOINTMENTS"]
}
```

### Clients
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/clients` | List clients | Yes |
| GET | `/clients/:id` | Get client details | Yes |
| POST | `/clients` | Create client | Yes |
| PUT | `/clients/:id` | Update client | Yes |
| DELETE | `/clients/:id` | Delete client | Admin |
| GET | `/clients/search` | Search clients | Yes |

#### GET /clients
**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10, max: 100)
- `search` (string): Search term
- `status` (string): ACTIVE | INACTIVE
- `sortBy` (string): name | email | createdAt
- `sortOrder` (string): asc | desc

**Response:**
```json
{
  "data": [
    {
      "id": "client_uuid",
      "name": "John Smith",
      "email": "john@example.com",
      "phone": "+1234567890",
      "status": "ACTIVE",
      "preferences": {
        "preferredStaff": ["staff_uuid"],
        "communicationMethod": "EMAIL",
        "notifications": true
      },
      "totalAppointments": 15,
      "totalSpent": 1250.00,
      "lastVisit": "2024-03-10T14:30:00Z",
      "createdAt": "2024-01-15T09:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 150,
    "totalPages": 15
  }
}
```

### Appointments (25 endpoints)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/appointments` | List appointments with filtering | Yes |
| GET | `/appointments/:id` | Get appointment details | Yes |
| POST | `/appointments` | Create appointment | Yes |
| PUT | `/appointments/:id` | Update appointment | Yes |
| DELETE | `/appointments/:id` | Cancel appointment | Yes |
| POST | `/appointments/:id/checkin` | Check-in client | Staff |
| POST | `/appointments/:id/start` | Start appointment | Staff |
| POST | `/appointments/:id/complete` | Complete appointment | Staff |
| POST | `/appointments/:id/no-show` | Mark as no-show | Staff |
| POST | `/appointments/:id/reschedule` | Reschedule appointment | Yes |
| GET | `/appointments/availability` | Get available slots | Yes |
| POST | `/appointments/availability/check` | Check specific slot availability | Yes |
| GET | `/appointments/bulk-availability` | Get bulk availability for calendar | Yes |
| GET | `/public/:companyId/availability` | Public availability (no auth) | No |
| POST | `/public/:companyId/booking` | Create public booking (no auth) | No |
| DELETE | `/public/:companyId/booking/:id` | Cancel public booking | No |
| GET | `/public/:companyId/bookings` | Get client bookings by phone | No |
| POST | `/public/:companyId/waitlist` | Add to waitlist | No |
| DELETE | `/public/:companyId/waitlist/:id` | Remove from waitlist | No |
| GET | `/appointments/recurring` | List recurring appointments | Yes |
| PUT | `/appointments/recurring/:id` | Update recurring series | Yes |
| DELETE | `/appointments/recurring/:id` | Cancel recurring series | Yes |
| GET | `/appointments/calendar/:date` | Get appointments for specific date | Yes |
| GET | `/appointments/stats` | Get appointment statistics | Admin |
| POST | `/appointments/bulk-operations` | Bulk appointment operations | Admin |

#### GET /appointments/availability
**Query Parameters:**
- `date` (string): Date (YYYY-MM-DD)
- `serviceIds` (string[]): Array of service IDs
- `staffId` (string, optional): Specific staff member
- `branchId` (string): Branch ID

**Response:**
```json
{
  "date": "2024-03-20",
  "availableSlots": [
    {
      "time": "09:00",
      "staffId": "staff_uuid",
      "staffName": "Sarah Johnson",
      "duration": 60,
      "services": ["service_uuid"]
    },
    {
      "time": "10:30",
      "staffId": "staff_uuid",
      "staffName": "Sarah Johnson",
      "duration": 90,
      "services": ["service_uuid_1", "service_uuid_2"]
    }
  ]
}
```

#### POST /appointments
**Request:**
```json
{
  "clientId": "client_uuid",
  "serviceIds": ["service_uuid_1", "service_uuid_2"],
  "staffId": "staff_uuid",
  "branchId": "branch_uuid",
  "dateTime": "2024-03-20T10:00:00Z",
  "notes": "Client requested specific styling",
  "isRecurring": false,
  "recurringPattern": {
    "frequency": "WEEKLY",
    "interval": 1,
    "endDate": "2024-06-20T10:00:00Z"
  }
}
```

### Services (12 endpoints)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/services` | List services with filtering | Yes |
| GET | `/services/:id` | Get service details | Yes |
| POST | `/services` | Create service | Admin |
| PUT | `/services/:id` | Update service | Admin |
| DELETE | `/services/:id` | Delete service | Admin |
| POST | `/services/:id/duplicate` | Duplicate service | Admin |
| GET | `/services/categories` | List service categories | Yes |
| POST | `/services/categories` | Create service category | Admin |
| PUT | `/services/categories/:id` | Update service category | Admin |
| DELETE | `/services/categories/:id` | Delete service category | Admin |
| GET | `/services/pricing` | Get service pricing matrix | Yes |
| POST | `/services/bulk-import` | Bulk import services | Admin |

#### GET /services
**Response:**
```json
{
  "data": [
    {
      "id": "service_uuid",
      "name": "Haircut",
      "description": "Professional haircut service",
      "category": "HAIR",
      "price": 50.00,
      "duration": 60,
      "isActive": true,
      "requirements": {
        "minAdvanceNotice": 24,
        "bufferTime": 15
      },
      "staff": [
        {
          "staffId": "staff_uuid",
          "name": "Sarah Johnson",
          "price": 55.00
        }
      ]
    }
  ]
}
```

### Staff (18 endpoints)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/staff` | List staff members with filtering | Yes |
| GET | `/staff/:id` | Get staff details | Yes |
| POST | `/staff` | Create staff member | Admin |
| PUT | `/staff/:id` | Update staff member | Admin |
| DELETE | `/staff/:id` | Delete staff member | Admin |
| GET | `/staff/:id/schedule` | Get staff schedule | Yes |
| PUT | `/staff/:id/schedule` | Update staff schedule | Admin |
| GET | `/staff/:id/availability` | Get staff availability | Yes |
| PUT | `/staff/:id/availability` | Update staff availability | Admin |
| GET | `/staff/:id/appointments` | Get staff appointments | Yes |
| GET | `/staff/:id/performance` | Get staff performance metrics | Admin |
| POST | `/staff/:id/time-off` | Request time off | Staff |
| GET | `/staff/:id/time-off` | Get time off requests | Yes |
| PUT | `/staff/:id/time-off/:requestId` | Update time off request | Admin |
| GET | `/staff/workload` | Get staff workload overview | Admin |
| POST | `/staff/bulk-schedule` | Bulk schedule update | Admin |
| GET | `/staff/positions` | List staff positions | Yes |
| POST | `/staff/positions` | Create staff position | Admin |

#### GET /staff/:id/schedule
**Query Parameters:**
- `startDate` (string): Start date (YYYY-MM-DD)
- `endDate` (string): End date (YYYY-MM-DD)

**Response:**
```json
{
  "staffId": "staff_uuid",
  "schedule": [
    {
      "date": "2024-03-20",
      "workingHours": {
        "start": "09:00",
        "end": "17:00"
      },
      "breaks": [
        {
          "start": "12:00",
          "end": "13:00",
          "type": "LUNCH"
        }
      ],
      "availability": "AVAILABLE",
      "appointments": [
        {
          "id": "appointment_uuid",
          "time": "10:00",
          "duration": 60,
          "clientName": "John Smith",
          "services": ["Haircut"]
        }
      ]
    }
  ]
}
```

### Branches (15 endpoints)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/branches` | List branches with filtering | Yes |
| GET | `/branches/:id` | Get branch details | Yes |
| POST | `/branches` | Create branch | Admin |
| PUT | `/branches/:id` | Update branch | Admin |
| DELETE | `/branches/:id` | Delete branch | Admin |
| GET | `/branches/:id/staff` | Get branch staff | Yes |
| POST | `/branches/:id/staff` | Assign staff to branch | Admin |
| DELETE | `/branches/:id/staff/:staffId` | Remove staff from branch | Admin |
| GET | `/branches/:id/services` | Get branch services | Yes |
| POST | `/branches/:id/services` | Assign services to branch | Admin |
| GET | `/branches/:id/schedule` | Get branch operating hours | Yes |
| PUT | `/branches/:id/schedule` | Update operating hours | Admin |
| GET | `/branches/:id/resources` | Get branch resources | Yes |
| POST | `/branches/:id/resources` | Add branch resource | Admin |
| GET | `/branches/:id/stats` | Get branch statistics | Admin |

### Invoices (20 endpoints)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/invoices` | List invoices with filtering | Yes |
| GET | `/invoices/:id` | Get invoice details | Yes |
| POST | `/invoices` | Create invoice | Yes |
| PUT | `/invoices/:id` | Update invoice | Yes |
| DELETE | `/invoices/:id` | Delete invoice | Admin |
| POST | `/invoices/:id/payment` | Record payment | Yes |
| GET | `/invoices/:id/pdf` | Download PDF | Yes |
| POST | `/invoices/:id/send` | Send invoice via email | Yes |
| POST | `/invoices/:id/duplicate` | Duplicate invoice | Yes |
| GET | `/invoices/:id/payments` | List invoice payments | Yes |
| DELETE | `/invoices/:id/payments/:paymentId` | Delete payment record | Admin |
| POST | `/invoices/:id/refund` | Process refund | Admin |
| GET | `/invoices/overdue` | List overdue invoices | Yes |
| GET | `/invoices/stats` | Invoice statistics | Admin |
| POST | `/invoices/bulk-send` | Bulk send invoices | Admin |
| GET | `/invoices/templates` | List invoice templates | Yes |
| POST | `/invoices/templates` | Create invoice template | Admin |
| PUT | `/invoices/templates/:id` | Update invoice template | Admin |
| DELETE | `/invoices/templates/:id` | Delete invoice template | Admin |
| POST | `/invoices/from-appointment/:appointmentId` | Generate invoice from appointment | Yes |

#### POST /invoices/:id/payment
**Request:**
```json
{
  "amount": 150.00,
  "method": "CREDIT_CARD",
  "reference": "txn_123456",
  "notes": "Full payment received"
}
```

### Notifications (8 endpoints)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/notifications` | List notifications | Yes |
| POST | `/notifications` | Send notification | Admin |
| PUT | `/notifications/:id/read` | Mark as read | Yes |
| DELETE | `/notifications/:id` | Delete notification | Yes |
| POST | `/notifications/broadcast` | Broadcast to company | Admin |
| GET | `/notifications/templates` | List notification templates | Admin |
| POST | `/notifications/templates` | Create notification template | Admin |
| GET | `/notifications/settings` | Get notification settings | Yes |

## WebSocket Events (Real-time)

### Connection
Connect to WebSocket server at `/socket.io/` with authentication:
```javascript
const socket = io('http://localhost:3000', {
  auth: {
    token: 'your_jwt_token',
    companyId: 'company_uuid'
  }
});
```

### Events (25+ real-time events)

#### Client Events (Send to Server)
- `join_room` - Join company-specific room
- `leave_room` - Leave room
- `appointment_update` - Update appointment status
- `staff_status_update` - Update staff availability
- `client_checkin` - Client check-in event

#### Server Events (Receive from Server)
- `appointment_created` - New appointment created
- `appointment_updated` - Appointment modified
- `appointment_cancelled` - Appointment cancelled
- `appointment_rescheduled` - Appointment rescheduled
- `client_checkin` - Client checked in
- `client_checkout` - Client checked out
- `staff_availability_changed` - Staff availability updated
- `invoice_created` - New invoice generated
- `payment_received` - Payment processed
- `notification_received` - New notification
- `waitlist_updated` - Waitlist position changed
- `schedule_updated` - Staff schedule changed
- `service_updated` - Service information changed
- `client_updated` - Client information updated
- `system_announcement` - System-wide announcement

#### Example Event Payloads
```javascript
// appointment_created
{
  "type": "appointment_created",
  "data": {
    "id": "appointment_uuid",
    "clientName": "John Smith",
    "staffName": "Sarah Johnson",
    "services": ["Haircut"],
    "dateTime": "2024-03-20T10:00:00Z",
    "status": "CONFIRMED"
  }
}
```

## Error Codes

### Authentication Errors
- `AUTH_001` - Invalid credentials
- `AUTH_002` - Token expired
- `AUTH_003` - Token malformed
- `AUTH_004` - Insufficient permissions

### Validation Errors
- `VAL_001` - Missing required field
- `VAL_002` - Invalid data format
- `VAL_003` - Data constraint violation
- `VAL_004` - Duplicate entry

### Business Logic Errors
- `BIZ_001` - Appointment conflict
- `BIZ_002` - Staff unavailable
- `BIZ_003` - Service not available
- `BIZ_004` - Insufficient advance notice

### System Errors
- `SYS_001` - Database connection error
- `SYS_002` - External service unavailable
- `SYS_003` - Rate limit exceeded
- `SYS_004` - Server error

## Rate Limits

### General API
- 100 requests per minute per user
- 1000 requests per minute per company

### Authentication
- 5 login attempts per 15 minutes per IP
- 10 login attempts per hour per email

### WebSocket
- 50 messages per minute per connection
- 1000 concurrent connections per company

## Pagination

All list endpoints support pagination:
```
GET /clients?page=1&limit=20
```

Response includes pagination metadata:
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```

## Filtering and Sorting

### Common Query Parameters
- `search` - Text search across relevant fields
- `sortBy` - Field to sort by
- `sortOrder` - `asc` or `desc`
- `status` - Filter by status
- `dateFrom` - Start date filter
- `dateTo` - End date filter

### Example
```
GET /appointments?status=CONFIRMED&dateFrom=2024-03-01&dateTo=2024-03-31&sortBy=dateTime&sortOrder=desc
```

## Data Types

### Date/Time Format
All dates use ISO 8601 format with timezone:
```
"2024-03-20T10:30:00Z"
```

### Currency
All monetary values are in decimal format:
```json
{
  "price": 150.00,
  "tax": 12.00,
  "total": 162.00
}
```

### Phone Numbers
Phone numbers include country code:
```
"+1234567890"
```

### IDs
All IDs are UUIDs:
```
"550e8400-e29b-41d4-a716-446655440000"
```

## API Versioning

Current version: `v1`

Version is specified in the URL:
```
/api/v1/clients
```

Future versions will maintain backward compatibility or provide migration guides.

## Testing

### Test Environment
```
Base URL: http://localhost:3000/api/v1
```

### Test Authentication
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123",
    "companyId": "test-company-id"
  }'
```

### Health Check
```bash
curl http://localhost:3000/api/v1/health
```

### Analytics & Reports (10 endpoints)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/analytics/dashboard` | Dashboard metrics | Admin |
| GET | `/analytics/appointments` | Appointment analytics | Admin |
| GET | `/analytics/revenue` | Revenue analytics | Admin |
| GET | `/analytics/staff` | Staff performance analytics | Admin |
| GET | `/analytics/clients` | Client analytics | Admin |
| GET | `/analytics/services` | Service performance | Admin |
| POST | `/analytics/custom` | Generate custom report | Admin |
| GET | `/analytics/export/:type` | Export analytics data | Admin |
| GET | `/analytics/trends` | Business trends | Admin |
| GET | `/analytics/forecasting` | Revenue forecasting | Admin |

### Inventory (12 endpoints)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/inventory/products` | List products | Yes |
| POST | `/inventory/products` | Create product | Admin |
| PUT | `/inventory/products/:id` | Update product | Admin |
| DELETE | `/inventory/products/:id` | Delete product | Admin |
| POST | `/inventory/stock-adjustment` | Adjust stock levels | Staff |
| POST | `/inventory/stock-transfer` | Transfer between branches | Admin |
| GET | `/inventory/low-stock` | Get low stock alerts | Admin |
| GET | `/inventory/valuation` | Get inventory valuation | Admin |
| POST | `/inventory/bulk-import` | Bulk import products | Admin |
| GET | `/inventory/movements` | Stock movement history | Admin |
| POST | `/inventory/barcode-scan` | Process barcode scan | Staff |
| GET | `/inventory/reports` | Inventory reports | Admin |

## API Totals Summary
- **Authentication**: 8 endpoints
- **Companies**: 10 endpoints  
- **Users**: 12 endpoints
- **Clients**: 15 endpoints
- **Appointments**: 25 endpoints
- **Services**: 12 endpoints
- **Staff**: 18 endpoints
- **Branches**: 15 endpoints
- **Invoices**: 20 endpoints
- **Notifications**: 8 endpoints
- **Analytics**: 10 endpoints
- **Inventory**: 12 endpoints
- **WebSocket Events**: 25+ real-time events
- **Health & System**: 5 endpoints

**Total API Endpoints: 190+**

## Support

### Documentation
- [Migration Success Report](MIGRATION_SUCCESS_REPORT.md)
- [Operations Guide](OPERATIONS_GUIDE.md)
- [Developer Guide](DEVELOPER_GUIDE.md)
- [Architecture Overview](ARCHITECTURE.md)
- [Deployment Checklist](DEPLOYMENT_CHECKLIST.md)

### Contact
- Technical Support: support@clients-plus.com
- API Issues: api-support@clients-plus.com
- Documentation: docs@clients-plus.com