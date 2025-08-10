# Comprehensive Appointment Management API Endpoints

This document outlines all the appointment management API endpoints that have been implemented to replace Firebase functionality with advanced features.

## Base URL
```
/api/appointments
```

## Authentication
All endpoints require authentication via Bearer token in the Authorization header:
```
Authorization: Bearer <access_token>
```

---

## Core Appointment Management

### 1. Create Appointment
**POST** `/`

Creates a new appointment with comprehensive validation and conflict detection.

**Request Body:**
```json
{
  "branchId": "string",
  "clientId": "string",
  "staffId": "string (optional)",
  "clientName": "string",
  "clientPhone": "string",
  "clientEmail": "string (optional)",
  "date": "2024-01-15",
  "startTime": "09:00",
  "endTime": "10:30 (optional)",
  "totalDuration": 90,
  "services": [
    {
      "serviceId": "string",
      "serviceName": "string",
      "duration": 60,
      "price": 100,
      "staffId": "string (optional)"
    }
  ],
  "totalPrice": 100,
  "status": "PENDING (optional)",
  "isRecurring": false,
  "recurringPattern": {
    "type": "WEEKLY",
    "interval": 1,
    "endDate": "2024-06-15 (optional)",
    "maxOccurrences": 10
  },
  "title": "string (optional)",
  "notes": "string (optional)",
  "notifications": [
    {
      "type": "reminder",
      "methods": ["SMS", "EMAIL"],
      "timing": 60
    }
  ]
}
```

### 2. Get Appointments (with Advanced Filtering)
**GET** `/`

**Query Parameters:**
- `branchId` (optional): Filter by branch
- `staffId` (optional): Filter by staff member
- `clientId` (optional): Filter by client
- `status` (optional): Filter by status (comma-separated)
- `source` (optional): Filter by source (comma-separated)
- `startDate` (optional): Filter from date
- `endDate` (optional): Filter to date
- `limit` (optional): Limit results (default: 50)
- `offset` (optional): Offset for pagination

### 3. Get Single Appointment
**GET** `/:id`

Returns detailed appointment information with related data.

### 4. Update Appointment
**PUT** `/:id`

Updates appointment with conflict validation. Supports partial updates.

### 5. Cancel Appointment
**DELETE** `/:id/cancel`

**Request Body:**
```json
{
  "reason": "string (optional)",
  "cancelledBy": "client|staff|system"
}
```

---

## Appointment Status Management

### 6. Reschedule Appointment
**POST** `/:id/reschedule`

**Request Body:**
```json
{
  "newDate": "2024-01-20",
  "newStartTime": "14:00",
  "newStaffId": "string (optional)"
}
```

### 7. Check-in Appointment
**POST** `/:id/check-in`

Marks client as arrived.

### 8. Start Appointment
**POST** `/:id/start`

Starts the appointment service.

### 9. Complete Appointment
**POST** `/:id/complete`

Marks appointment as completed.

### 10. Mark No-Show
**POST** `/:id/no-show`

Marks appointment as no-show.

---

## Availability Management

### 11. Get Available Slots
**GET** `/availability/slots`

**Query Parameters:**
- `branchId` (required)
- `date` (required): Date in YYYY-MM-DD format
- `serviceIds` (required): Array of service IDs
- `staffId` (optional)
- `duration` (optional): Duration in minutes
- `resourceIds` (optional): Array of resource IDs

### 12. Check Slot Availability
**POST** `/availability/check`

**Request Body:**
```json
{
  "serviceIds": ["string"]
}
```

**Query Parameters:**
- `branchId`, `date`, `startTime`, `staffId`

### 13. Get Bulk Availability
**POST** `/availability/bulk`

For calendar views and date range availability.

**Request Body:**
```json
{
  "serviceIds": ["string"]
}
```

**Query Parameters:**
- `companyId`, `branchId`, `startDate`, `endDate`, `staffId`

---

## Advanced Features

### 14. Get Client Appointment History
**GET** `/clients/:clientId/history`

**Query Parameters:**
- `limit` (optional): Default 50
- `offset` (optional): Default 0
- `includeAnalytics` (optional): Include analytics data

**Response includes:**
- Appointment history
- Client analytics (spending, frequency, favorite staff)
- Pagination information

### 15. Get Staff Schedule
**GET** `/staff/:staffId/schedule`

**Query Parameters:**
- `date` (required): Date for schedule
- `view` (optional): "day"|"week"|"month" (default: "day")

### 16. Bulk Appointment Operations
**POST** `/bulk-operation`

**Request Body:**
```json
{
  "operation": "cancel|complete|reschedule|update-status",
  "appointmentIds": ["string"],
  "data": {
    "reason": "string (for cancel)",
    "status": "string (for update-status)",
    "newDate": "string (for reschedule)",
    "newStartTime": "string (for reschedule)"
  }
}
```

### 17. Check Appointment Conflicts
**GET** `/conflicts`

**Query Parameters:**
- `branchId`, `date`, `startTime`, `duration`, `staffId` (optional), `resourceId` (optional), `excludeAppointmentId` (optional)

### 18. Get Appointment Analytics
**GET** `/analytics`

**Query Parameters:**
- `startDate`, `endDate` (required)
- `branchId`, `staffId` (optional)
- `groupBy`: "day"|"week"|"month"

**Response includes:**
- Total appointments and status breakdown
- Revenue analytics
- Top services and staff
- Busy hours analysis
- Client analytics
- Trends data

### 19. Update Appointment Notes
**PUT** `/:id/notes`

**Request Body:**
```json
{
  "notes": "string",
  "internalNotes": "string"
}
```

### 20. Add Appointment Attachments
**POST** `/:id/attachments`

**Request Body:**
```json
{
  "attachmentUrl": "string",
  "attachmentType": "image|document|other",
  "description": "string (optional)"
}
```

### 21. Find Optimal Reschedule Time
**POST** `/:id/reschedule/suggestions`

**Request Body:**
```json
{
  "preferredDates": ["2024-01-20", "2024-01-21"],
  "preferredTimes": ["09:00", "14:00"]
}
```

---

## Statistics and Reporting

### 22. Get No-Show Statistics
**GET** `/statistics/no-shows`

**Query Parameters:**
- `startDate`, `endDate` (optional)
- `branchId`, `clientId` (optional)

**Response includes:**
- No-show rates and patterns
- Client breakdown
- Time pattern analysis
- Revenue impact
- Staff breakdown

---

## Recurring Appointment Management

Base URL: `/api/appointments/recurring`

### 23. Create Recurring Series
**POST** `/`

**Request Body:**
```json
{
  "branchId": "string",
  "clientId": "string",
  "clientName": "string",
  "clientPhone": "string",
  "startDate": "2024-01-15",
  "startTime": "09:00",
  "totalDuration": 60,
  "services": [
    {
      "serviceId": "string",
      "serviceName": "string",
      "duration": 60,
      "price": 100
    }
  ],
  "totalPrice": 100,
  "recurringPattern": {
    "type": "WEEKLY",
    "interval": 1,
    "endDate": "2024-06-15",
    "maxOccurrences": 20,
    "specificDays": [1, 3, 5],
    "excludeDates": ["2024-02-14", "2024-03-15"]
  }
}
```

### 24. Get Recurring Series
**GET** `/:groupId`

**Query Parameters:**
- `includeAppointments`: Include all appointments in series

### 25. Update Recurring Series
**PUT** `/:groupId`

**Query Parameters:**
- `appointmentId` (optional): Context appointment for THIS_ONLY updates

**Request Body:**
```json
{
  "updateType": "THIS_ONLY|THIS_AND_FUTURE|ALL_OCCURRENCES",
  "startTime": "10:00 (optional)",
  "staffId": "string (optional)",
  "recurringPattern": {
    "interval": 2,
    "endDate": "2024-08-15"
  }
}
```

### 26. Delete Recurring Series
**DELETE** `/:groupId`

**Query Parameters:**
- `appointmentId` (optional)
- `deleteType`: "THIS_ONLY"|"THIS_AND_FUTURE"|"ALL_OCCURRENCES"
- `reason` (optional)

### 27. Get Company Recurring Series
**GET** `/`

**Query Parameters:**
- `status`, `branchId`, `staffId`, `clientId` (optional)
- `limit`, `offset` (pagination)

### 28. Skip Occurrence
**POST** `/:groupId/occurrences/:appointmentId/skip`

**Request Body:**
```json
{
  "reason": "string"
}
```

### 29. Reschedule Occurrence
**POST** `/:groupId/occurrences/:appointmentId/reschedule`

**Request Body:**
```json
{
  "newDate": "2024-01-20",
  "newStartTime": "14:00",
  "newStaffId": "string (optional)",
  "applyToFuture": false
}
```

### 30. Preview Upcoming Occurrences
**GET** `/:groupId/preview`

**Query Parameters:**
- `limit` (optional): Default 10

### 31. Check Recurring Conflicts
**POST** `/check-conflicts`

Similar to single appointment conflict check but for entire recurring series.

### 32. Get Recurring Statistics
**GET** `/statistics/overview`

**Query Parameters:**
- `startDate`, `endDate` (optional)
- `branchId`, `staffId` (optional)

---

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message",
  "data": {
    "details": "Additional error details"
  },
  "timestamp": "2024-01-15T10:00:00Z"
}
```

## Success Responses

All successful responses follow this format:

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    // Response data
  },
  "timestamp": "2024-01-15T10:00:00Z"
}
```

---

## Key Features Implemented

1. **Firebase Replacement**: Complete replacement of Firebase appointments with enhanced PostgreSQL-based system
2. **Advanced Conflict Detection**: Multi-level conflict checking (staff, resource, client, business hours)
3. **Recurring Appointments**: Comprehensive recurring appointment management with flexible patterns
4. **Analytics**: Detailed appointment analytics and reporting
5. **Bulk Operations**: Efficient bulk operations for appointment management
6. **Multi-Service Support**: Support for appointments with multiple services
7. **Resource Scheduling**: Advanced resource-based scheduling
8. **No-Show Tracking**: Comprehensive no-show statistics and patterns
9. **Smart Rescheduling**: Intelligent reschedule suggestions
10. **Real-time Availability**: Advanced availability checking with multiple scenarios

## Performance Considerations

- All queries use appropriate database indexes
- Pagination implemented for large datasets  
- Caching strategies for frequently accessed data
- Optimized conflict detection algorithms
- Bulk operations for efficiency

## Security Features

- Authentication required for all endpoints
- Role-based access control
- Company data isolation
- Input validation and sanitization
- Rate limiting protection