# Clients+ API Documentation

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
```

### Authentication Flow
1. **Login**: POST `/auth/login`
2. **Verify Token**: GET `/auth/me`
3. **Refresh Token**: POST `/auth/refresh` (if implemented)

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

### Appointments
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/appointments` | List appointments | Yes |
| GET | `/appointments/:id` | Get appointment details | Yes |
| POST | `/appointments` | Create appointment | Yes |
| PUT | `/appointments/:id` | Update appointment | Yes |
| DELETE | `/appointments/:id` | Cancel appointment | Yes |
| POST | `/appointments/:id/checkin` | Check-in client | Staff |
| GET | `/appointments/availability` | Get available slots | Yes |

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

### Services
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/services` | List services | Yes |
| GET | `/services/:id` | Get service details | Yes |
| POST | `/services` | Create service | Admin |
| PUT | `/services/:id` | Update service | Admin |
| DELETE | `/services/:id` | Delete service | Admin |

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

### Staff
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/staff` | List staff members | Yes |
| GET | `/staff/:id` | Get staff details | Yes |
| POST | `/staff` | Create staff member | Admin |
| PUT | `/staff/:id` | Update staff member | Admin |
| DELETE | `/staff/:id` | Delete staff member | Admin |
| GET | `/staff/:id/schedule` | Get staff schedule | Yes |
| PUT | `/staff/:id/schedule` | Update staff schedule | Admin |

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

### Branches
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/branches` | List branches | Yes |
| GET | `/branches/:id` | Get branch details | Yes |
| POST | `/branches` | Create branch | Admin |
| PUT | `/branches/:id` | Update branch | Admin |
| DELETE | `/branches/:id` | Delete branch | Admin |

### Invoices
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/invoices` | List invoices | Yes |
| GET | `/invoices/:id` | Get invoice details | Yes |
| POST | `/invoices` | Create invoice | Yes |
| PUT | `/invoices/:id` | Update invoice | Yes |
| POST | `/invoices/:id/payment` | Record payment | Yes |
| GET | `/invoices/:id/pdf` | Download PDF | Yes |

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

## WebSocket Events

### Connection
Connect to WebSocket server at `/socket.io/` with authentication:
```javascript
const socket = io('http://localhost:3000', {
  auth: {
    token: 'your_jwt_token'
  }
});
```

### Events

#### Client Events (Send to Server)
- `join_room` - Join company-specific room
- `leave_room` - Leave room
- `appointment_update` - Update appointment status

#### Server Events (Receive from Server)
- `appointment_created` - New appointment created
- `appointment_updated` - Appointment modified
- `appointment_cancelled` - Appointment cancelled
- `client_checkin` - Client checked in
- `staff_availability_changed` - Staff availability updated

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

## Support

### Documentation
- [Migration Guide](MIGRATION_GUIDE.md)
- [Deployment Guide](DEPLOYMENT_GUIDE.md)
- [Operations Manual](OPERATIONS_MANUAL.md)

### Contact
- Technical Support: support@clients-plus.com
- API Issues: api-support@clients-plus.com
- Documentation: docs@clients-plus.com