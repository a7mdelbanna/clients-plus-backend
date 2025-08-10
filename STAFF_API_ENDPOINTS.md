# Staff Management API Endpoints

## Overview
Comprehensive Staff management system that replicates Firebase functionality with enhanced enterprise features including commission tracking, performance metrics, and advanced scheduling.

## Base URL
All endpoints are prefixed with `/api/v1/staff`

## Authentication
All endpoints require authentication via JWT token in the Authorization header.

---

## Staff CRUD Operations

### GET `/api/v1/staff`
Get all staff members with filtering options.

**Query Parameters:**
- `branchId` (string, optional) - Filter by branch
- `serviceId` (string, optional) - Filter by service
- `positionId` (string, optional) - Filter by position
- `accessLevel` (enum, optional) - OWNER, MANAGER, EMPLOYEE
- `status` (enum, optional) - ACTIVE, INACTIVE, TERMINATED
- `searchTerm` (string, optional) - Search in name, email, phone
- `onlineBookingEnabled` (boolean, optional) - Filter by online booking availability

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "staff_123",
      "name": "John Doe",
      "nameAr": "جون دو",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "mobile": "+1234567891",
      "specialization": "Hair Styling",
      "accessLevel": "EMPLOYEE",
      "status": "ACTIVE",
      "commissionRate": 0.15,
      "hourlyRate": 25.00,
      "onlineBookingEnabled": true,
      "branches": [
        {
          "branchId": "branch_123",
          "isPrimary": true,
          "branch": {
            "id": "branch_123",
            "name": "Downtown Branch",
            "type": "MAIN"
          }
        }
      ],
      "services": [
        {
          "serviceId": "service_123",
          "price": 50.00,
          "service": {
            "id": "service_123",
            "name": "Haircut",
            "startingPrice": 45.00,
            "duration": {"hours": 1, "minutes": 0}
          }
        }
      ]
    }
  ]
}
```

### GET `/api/v1/staff/:id`
Get specific staff member details.

### POST `/api/v1/staff`
Create new staff member.

**Request Body:**
```json
{
  "name": "John Doe",
  "nameAr": "جون دو",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "specialization": "Hair Styling",
  "accessLevel": "EMPLOYEE",
  "commissionRate": 0.15,
  "hourlyRate": 25.00,
  "branchIds": ["branch_123"],
  "serviceIds": ["service_123", "service_124"],
  "onlineBookingEnabled": true,
  "qualifications": "5 years experience",
  "bio": "Expert hair stylist"
}
```

### PUT `/api/v1/staff/:id`
Update staff member information.

### DELETE `/api/v1/staff/:id`
Soft delete (deactivate) staff member.

---

## Staff Filtering and Search

### GET `/api/v1/staff/by-service/:serviceId`
Get staff members who provide a specific service.

### GET `/api/v1/staff/by-branch/:branchId`
Get staff members assigned to a specific branch.

### GET `/api/v1/staff/stats`
Get company staff statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalStaff": 15,
    "activeStaff": 12,
    "onlineBookingEnabled": 8,
    "byAccessLevel": {
      "OWNER": 1,
      "MANAGER": 3,
      "EMPLOYEE": 11
    },
    "byStatus": {
      "ACTIVE": 12,
      "INACTIVE": 2,
      "TERMINATED": 1
    }
  }
}
```

---

## Service and Branch Assignments

### POST `/api/v1/staff/:id/assign-service`
Assign service to staff member.

**Request Body:**
```json
{
  "serviceId": "service_123"
}
```

### DELETE `/api/v1/staff/:id/unassign-service/:serviceId`
Remove service assignment from staff member.

### POST `/api/v1/staff/:id/assign-branch`
Assign staff member to branch.

**Request Body:**
```json
{
  "branchId": "branch_123",
  "isPrimary": true
}
```

### DELETE `/api/v1/staff/:id/unassign-branch/:branchId`
Remove staff member from branch.

---

## Schedule Management

### GET `/api/v1/staff/:id/schedule`
Get staff member's schedule.

**Query Parameters:**
- `branchId` (string, optional) - Get schedule for specific branch

### PUT `/api/v1/staff/:id/schedule`
Update staff member's schedule.

**Request Body:**
```json
{
  "branchId": "branch_123",
  "workingDays": [
    {
      "dayOfWeek": 1,
      "isWorking": true,
      "startTime": "09:00",
      "endTime": "17:00",
      "breaks": [
        {
          "start": "12:00",
          "end": "13:00"
        }
      ]
    }
  ],
  "startDate": "2024-01-01T00:00:00Z",
  "endDate": "2024-12-31T23:59:59Z"
}
```

### GET `/api/v1/staff/:id/working-hours`
Get working hours summary for staff member.

### POST `/api/v1/staff/:id/copy-schedule`
Copy schedule from one branch to others.

**Request Body:**
```json
{
  "sourceBranchId": "branch_123",
  "targetBranchIds": ["branch_124", "branch_125"]
}
```

---

## Availability and Time Off

### GET `/api/v1/staff/:id/availability`
Check staff availability for specific date and duration.

**Query Parameters:**
- `date` (ISO string, required) - Date to check
- `duration` (number, required) - Duration in minutes
- `branchId` (string, required) - Branch ID

### GET `/api/v1/staff/:id/next-available`
Find next available time slot.

**Query Parameters:**
- `branchId` (string, required)
- `serviceDuration` (number, required) - Duration in minutes
- `fromDate` (ISO string, optional) - Start searching from date
- `maxDaysAhead` (number, optional) - Maximum days to search ahead (default: 30)

### POST `/api/v1/staff/:id/time-off`
Request time off for staff member.

**Request Body:**
```json
{
  "startDate": "2024-06-01T00:00:00Z",
  "endDate": "2024-06-07T23:59:59Z",
  "type": "VACATION",
  "reason": "Annual vacation"
}
```

### GET `/api/v1/staff/:id/time-off`
Get time off records for staff member.

---

## Commission and Performance Tracking

### GET `/api/v1/staff/:id/commission`
Get commission data for staff member.

**Query Parameters:**
- `startDate` (ISO string, optional) - Start date for calculation
- `endDate` (ISO string, optional) - End date for calculation
- `branchId` (string, optional) - Filter by branch

**Response:**
```json
{
  "success": true,
  "data": {
    "totalCommission": 1250.00,
    "appointments": 25,
    "revenue": 8333.33,
    "commissionRate": 0.15,
    "breakdown": [
      {
        "date": "2024-01-15",
        "appointments": 3,
        "revenue": 300.00,
        "commission": 45.00
      }
    ]
  }
}
```

### GET `/api/v1/staff/:id/performance`
Get performance metrics for staff member.

**Query Parameters:**
- `period` (string, optional) - weekly, monthly, quarterly (default: monthly)
- `branchId` (string, optional) - Filter by branch

**Response:**
```json
{
  "success": true,
  "data": {
    "appointmentsCompleted": 23,
    "appointmentsCancelled": 2,
    "noShowRate": 8.0,
    "averageRating": 4.5,
    "revenue": 2875.00,
    "utilizationRate": 75.5,
    "clientRetentionRate": 68.2
  }
}
```

### GET `/api/v1/staff/:id/revenue`
Get revenue analytics for staff member.

**Query Parameters:**
- `startDate` (ISO string, optional)
- `endDate` (ISO string, optional)
- `groupBy` (string, optional) - daily, weekly, monthly (default: daily)
- `branchId` (string, optional)

**Response:**
```json
{
  "success": true,
  "data": {
    "totalRevenue": 12500.00,
    "avgRevenuePerAppointment": 125.00,
    "revenueGrowth": 15.5,
    "topServices": [
      {
        "serviceName": "Haircut",
        "revenue": 5000.00,
        "appointments": 40
      }
    ],
    "timeline": [
      {
        "period": "2024-01-15",
        "revenue": 500.00,
        "appointments": 4
      }
    ]
  }
}
```

### POST `/api/v1/staff/:id/commission-rate`
Update commission rate for staff member.

**Request Body:**
```json
{
  "commissionRate": 0.18
}
```

---

## Position/Role Management

### GET `/api/v1/staff/positions`
Get all staff positions for company.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "pos_123",
      "name": "Senior Stylist",
      "description": "Experienced hair stylist",
      "permissions": {
        "canBookAppointments": true,
        "canViewReports": false
      },
      "staffCount": 5
    }
  ]
}
```

### POST `/api/v1/staff/positions`
Create new staff position.

**Request Body:**
```json
{
  "name": "Junior Stylist",
  "description": "Entry level stylist position",
  "permissions": {
    "canBookAppointments": true,
    "canViewReports": false
  }
}
```

### PUT `/api/v1/staff/positions/:positionId`
Update staff position.

### DELETE `/api/v1/staff/positions/:positionId`
Delete staff position.

---

## Staff Management Operations

### POST `/api/v1/staff/reorder`
Reorder staff display order.

**Request Body:**
```json
{
  "staffOrders": [
    {
      "staffId": "staff_123",
      "order": 1
    },
    {
      "staffId": "staff_124",
      "order": 2
    }
  ]
}
```

### POST `/api/v1/staff/:id/send-invitation`
Send invitation to staff member for system access.

---

## Enterprise Features

### Multi-Branch Support
- Staff can be assigned to multiple branches
- Primary branch designation
- Branch-specific schedules and availability

### Advanced Scheduling
- Complex working hours with breaks
- Schedule templates and copying
- Availability prediction and slot finding

### Commission Tracking
- Detailed commission calculations
- Historical performance data
- Revenue analytics with growth metrics

### Performance Metrics
- Utilization rates
- Client retention tracking
- No-show and cancellation rates
- Service-specific performance

### Role-Based Access Control
- Hierarchical access levels (Owner, Manager, Employee)
- Custom permissions per position
- Invitation-based access management

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "errors": [] // Optional detailed errors for validation failures
}
```

Common HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request / Validation Error
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

## Database Models

### Staff Model Features
- Multi-language support (Arabic names)
- Commission and hourly rate tracking
- Multiple contact methods (phone, mobile, email)
- Professional qualifications and certifications
- Online booking configuration
- Access levels and invitation status
- Employment tracking (hire date, termination date)

### Related Models
- `StaffBranch` - Many-to-many branch assignments
- `StaffService` - Service assignments with custom pricing
- `StaffSchedule` - Detailed schedule management
- `StaffTimeOff` - Time off tracking and approval

This comprehensive API provides all the functionality needed to manage staff in a multi-branch service business, with enterprise-grade features for performance tracking and commission management.