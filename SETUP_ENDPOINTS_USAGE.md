# Setup Wizard Endpoints Documentation

This document provides a comprehensive guide for using the setup wizard endpoints in the Clients+ backend.

## Overview

The setup wizard is a multi-step onboarding process that helps companies configure their initial settings, including:

1. **Business Information** - Company details, business type, contact info
2. **Branches** - Location/branch setup
3. **Team Information** - Team size and organizational structure
4. **Theme** - Visual appearance and branding

## Database Schema Changes

The following fields have been added to the `Company` model:

```prisma
// Setup wizard tracking
setupCompleted Boolean @default(false)
setupProgress  Json?   // Track which steps are completed: {businessInfo: true, branches: false, ...}
setupData      Json?   // Store setup configuration data temporarily
teamSize       String? // Team size selection
selectedTheme  String? // Theme selection
```

## API Endpoints

All endpoints require JWT authentication and use the `/api/v1/setup` prefix.

### 1. Get Setup Status
**GET** `/api/v1/setup/status`

Returns the current setup completion status and progress.

**Response:**
```json
{
  "success": true,
  "data": {
    "isCompleted": false,
    "progress": {
      "businessInfo": true,
      "branches": false,
      "teamInfo": false,
      "theme": false
    },
    "data": {
      "businessInfo": {...},
      "branches": {...}
    }
  },
  "timestamp": "2025-08-10T15:00:00.000Z"
}
```

### 2. Get Setup Progress
**GET** `/api/v1/setup/progress`

Returns detailed progress information including current step and percentage.

**Response:**
```json
{
  "success": true,
  "data": {
    "currentStep": "branches",
    "completedSteps": ["businessInfo"],
    "totalSteps": 4,
    "progressPercentage": 25
  },
  "timestamp": "2025-08-10T15:00:00.000Z"
}
```

### 3. Save Business Information
**POST** `/api/v1/setup/business-info`

Saves company business information and marks the business info step as complete.

**Request Body:**
```json
{
  "name": "My Company Ltd.",
  "businessType": "Technology Services",
  "phone": "+1234567890",
  "website": "https://mycompany.com",
  "address": {
    "street": "123 Business St",
    "city": "Business City",
    "state": "BC",
    "zipCode": "12345",
    "country": "Country"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Business information saved successfully",
  "data": {
    "id": "company_id",
    "name": "My Company Ltd.",
    "businessType": "Technology Services",
    "phone": "+1234567890",
    "website": "https://mycompany.com",
    "address": {...}
  },
  "timestamp": "2025-08-10T15:00:00.000Z"
}
```

### 4. Save Branches
**POST** `/api/v1/setup/branches`

Creates branches and marks the branches step as complete.

**Request Body:**
```json
{
  "branches": [
    {
      "name": "Main Office",
      "address": {
        "street": "123 Main St",
        "city": "Main City",
        "state": "MC",
        "zipCode": "12345",
        "country": "Country"
      },
      "phone": "+1234567890",
      "email": "main@company.com",
      "isMain": true
    },
    {
      "name": "Branch Office",
      "address": {
        "street": "456 Branch Ave",
        "city": "Branch City",
        "state": "BC",
        "zipCode": "67890",
        "country": "Country"
      },
      "phone": "+1234567891",
      "email": "branch@company.com",
      "isMain": false
    }
  ]
}
```

**Validation Rules:**
- At least one branch is required
- At least one branch must be marked as `isMain: true`
- All branches require `name` and `address.street`, `address.city`

**Response:**
```json
{
  "success": true,
  "message": "Branches saved successfully",
  "data": [
    {
      "id": "branch_id_1",
      "name": "Main Office",
      "address": {...},
      "type": "MAIN",
      "status": "ACTIVE"
    },
    {
      "id": "branch_id_2",
      "name": "Branch Office",
      "address": {...},
      "type": "SECONDARY",
      "status": "ACTIVE"
    }
  ],
  "timestamp": "2025-08-10T15:00:00.000Z"
}
```

### 5. Save Team Information
**POST** `/api/v1/setup/team-info`

Saves team configuration and marks the team info step as complete.

**Request Body:**
```json
{
  "teamSize": "6-20",
  "departments": ["Sales", "Marketing", "Development"],
  "roles": ["Manager", "Developer", "Designer"]
}
```

**Team Size Options:**
- `"1-5"`
- `"6-20"`
- `"21-50"`
- `"51-100"`
- `"100+"`

**Response:**
```json
{
  "success": true,
  "message": "Team information saved successfully",
  "data": {
    "id": "company_id",
    "teamSize": "6-20"
  },
  "timestamp": "2025-08-10T15:00:00.000Z"
}
```

### 6. Save Theme
**POST** `/api/v1/setup/theme`

Saves theme selection and marks the theme step as complete.

**Request Body:**
```json
{
  "theme": "modern-blue",
  "primaryColor": "#2563eb",
  "secondaryColor": "#64748b",
  "logo": "https://example.com/logo.png"
}
```

**Validation Rules:**
- `theme` is required (string, max 50 characters)
- Colors must be valid hex codes (optional)
- Logo must be a valid URL (optional)

**Response:**
```json
{
  "success": true,
  "message": "Theme saved successfully",
  "data": {
    "id": "company_id",
    "selectedTheme": "modern-blue",
    "logo": "https://example.com/logo.png"
  },
  "timestamp": "2025-08-10T15:00:00.000Z"
}
```

### 7. Complete Setup
**POST** `/api/v1/setup/complete`

Marks the entire setup wizard as complete. All previous steps must be completed first.

**Request Body:** None

**Response:**
```json
{
  "success": true,
  "message": "Setup completed successfully",
  "data": {
    "id": "company_id",
    "setupCompleted": true,
    "name": "My Company Ltd."
  },
  "timestamp": "2025-08-10T15:00:00.000Z"
}
```

**Error Response (if setup incomplete):**
```json
{
  "success": false,
  "message": "Cannot complete setup: not all steps are finished",
  "error": "SETUP_INCOMPLETE",
  "timestamp": "2025-08-10T15:00:00.000Z"
}
```

### 8. Reset Setup (Admin Only)
**DELETE** `/api/v1/setup/reset`

Resets the setup wizard for testing or re-setup. Only available to Admin and Super Admin users.

**Request Body:** None

**Response:**
```json
{
  "success": true,
  "message": "Setup reset successfully",
  "data": {
    "id": "company_id",
    "setupCompleted": false
  },
  "timestamp": "2025-08-10T15:00:00.000Z"
}
```

## Frontend Integration Example

Here's a basic example of how to integrate these endpoints in a frontend application:

```typescript
class SetupWizardService {
  private apiUrl = '/api/v1/setup';
  
  async getStatus() {
    const response = await fetch(`${this.apiUrl}/status`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json();
  }
  
  async getProgress() {
    const response = await fetch(`${this.apiUrl}/progress`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json();
  }
  
  async saveBusinessInfo(data: BusinessInfoData) {
    const response = await fetch(`${this.apiUrl}/business-info`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    return response.json();
  }
  
  async saveBranches(branches: BranchData[]) {
    const response = await fetch(`${this.apiUrl}/branches`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ branches })
    });
    return response.json();
  }
  
  async saveTeamInfo(data: TeamInfoData) {
    const response = await fetch(`${this.apiUrl}/team-info`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    return response.json();
  }
  
  async saveTheme(data: ThemeData) {
    const response = await fetch(`${this.apiUrl}/theme`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    return response.json();
  }
  
  async completeSetup() {
    const response = await fetch(`${this.apiUrl}/complete`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json();
  }
}
```

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "error": "ERROR_CODE",
  "timestamp": "2025-08-10T15:00:00.000Z"
}
```

Common error codes:
- `MISSING_TOKEN` - No authorization token provided
- `UNAUTHORIZED` - Invalid or expired token
- `COMPANY_NOT_FOUND` - Company not found in database
- `VALIDATION_ERROR` - Invalid request data
- `SETUP_INCOMPLETE` - Trying to complete setup with missing steps
- `FORBIDDEN` - User doesn't have required permissions

## Authentication

All endpoints require a valid JWT token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

The token must contain a valid `companyId` claim, as the setup wizard operates within the context of the authenticated user's company.

## Testing

You can test the endpoints using curl or any HTTP client:

```bash
# Get setup status (replace TOKEN with actual JWT)
curl -H "Authorization: Bearer TOKEN" \
     http://localhost:3000/api/v1/setup/status

# Save business info
curl -H "Authorization: Bearer TOKEN" \
     -H "Content-Type: application/json" \
     -X POST \
     -d '{"name":"Test Company","businessType":"Technology"}' \
     http://localhost:3000/api/v1/setup/business-info
```