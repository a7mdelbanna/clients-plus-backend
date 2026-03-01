# API Service Layer

This directory contains the comprehensive API service layer for migrating from Firebase to Express API endpoints while maintaining backward compatibility.

## Architecture Overview

```
src/services/api/
├── config.ts          # Axios configuration, interceptors, token management
├── auth.api.ts         # Authentication service (login, logout, token refresh)
├── client.api.ts       # Client CRUD operations API service
├── adapter.ts          # Firebase-to-Express compatibility adapter
├── index.ts           # Centralized exports and service factory
└── README.md          # This documentation
```

## Features

- **JWT Authentication**: Automatic token management with refresh logic
- **Request/Response Interceptors**: Error handling, logging, retry mechanisms
- **Backward Compatibility**: Adapter layer maintains Firebase interface compatibility
- **TypeScript Support**: Full type safety with comprehensive interfaces
- **Error Handling**: Robust error handling with user-friendly messages
- **Auto-retry**: Network error recovery with exponential backoff
- **Health Checks**: API connectivity monitoring
- **Migration Utilities**: Tools for comparing and validating data

## Quick Start

### 1. Install Dependencies

```bash
npm install axios
```

### 2. Basic Usage

```typescript
import { authApiService, clientApiAdapter } from '@/services/api';

// Login user
const user = await authApiService.login({
  email: 'user@example.com',
  password: 'password'
});

// Get clients (using adapter for Firebase compatibility)
const result = await clientApiAdapter.getClients('companyId', {
  status: 'active',
  searchTerm: 'john'
});
```

### 3. Drop-in Replacement

Replace existing Firebase service imports:

```typescript
// Before (Firebase)
import { clientService } from '@/services/client.service';

// After (Express API with compatibility)
import { clientApiAdapter as clientService } from '@/services/api';

// All existing code works without changes!
const client = await clientService.getClient('clientId');
```

## API Configuration

### Environment Variables

Create a `.env` file with:

```env
REACT_APP_API_BASE_URL=http://localhost:3000/api/v1
REACT_APP_API_TIMEOUT=30000
REACT_APP_ENABLE_API_LOGGING=true
```

### Token Management

The token manager handles JWT tokens automatically:

```typescript
import { TokenManager } from '@/services/api/config';

// Check if user is authenticated
if (TokenManager.hasValidToken()) {
  // User is logged in with valid token
}

// Manual token management
TokenManager.setTokens(accessToken, refreshToken, expiresIn);
TokenManager.clearTokens();
```

## Authentication Service

### Login/Logout

```typescript
import { authApiService } from '@/services/api';

// Login
const user = await authApiService.login({
  email: 'user@example.com',
  password: 'password',
  rememberMe: true
});

// Logout
await authApiService.logout();

// Check authentication status
const isAuthenticated = authApiService.isAuthenticated();
```

### Token Refresh

Automatic token refresh happens behind the scenes, but you can also trigger it manually:

```typescript
try {
  const newToken = await authApiService.refreshToken();
} catch (error) {
  // Token refresh failed, user needs to login again
  console.error('Token refresh failed:', error);
}
```

### Profile Management

```typescript
// Get current user
const user = await authApiService.getCurrentUser();

// Update profile
const updatedUser = await authApiService.updateProfile({
  displayName: 'New Name',
  email: 'newemail@example.com'
});

// Change password
await authApiService.changePassword({
  currentPassword: 'oldpass',
  newPassword: 'newpass'
});
```

## Client API Service

### Direct API Usage

```typescript
import { clientApiService } from '@/services/api';

// Get clients with pagination
const result = await clientApiService.getClients({
  status: 'ACTIVE',
  search: 'john',
  page: 1,
  limit: 10
});

// Create client
const newClient = await clientApiService.createClient({
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  phone: '+1234567890',
  status: 'ACTIVE'
});

// Update client
const updatedClient = await clientApiService.updateClient(clientId, {
  firstName: 'Jane',
  email: 'jane@example.com'
});

// Search clients
const searchResults = await clientApiService.searchClients('john doe');
```

### Available Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/clients` | Get clients with filtering and pagination |
| GET | `/clients/{id}` | Get client by ID |
| POST | `/clients` | Create new client |
| PUT | `/clients/{id}` | Update client |
| DELETE | `/clients/{id}` | Delete client (soft delete) |
| GET | `/clients/all` | Get all clients for dropdown |
| GET | `/clients/suggestions` | Get client suggestions for autocomplete |
| GET | `/clients/search` | Search clients |
| GET | `/clients/stats` | Get client statistics |
| POST | `/clients/check-duplicates` | Check for duplicate clients |
| POST | `/clients/bulk-update` | Bulk update multiple clients |
| POST | `/clients/{id}/update-stats` | Update client statistics |

## Adapter Layer (Firebase Compatibility)

The adapter layer allows existing components to work without modification:

```typescript
import { clientApiAdapter } from '@/services/api';

// All Firebase client service methods are available
const clients = await clientApiAdapter.getClients('companyId');
const client = await clientApiAdapter.getClient('clientId');
await clientApiAdapter.createClient(clientData, userId);
await clientApiAdapter.updateClient(clientId, updates);
await clientApiAdapter.deleteClient(clientId);

// Real-time updates (using polling since Express doesn't support WebSocket)
const unsubscribe = clientApiAdapter.subscribeToClients(
  'companyId',
  (clients) => console.log('Updated clients:', clients)
);
```

## Migration Guide

### Step 1: Install and Configure

1. Install axios: `npm install axios`
2. Update environment variables
3. Import the new services

### Step 2: Replace Service Imports

```typescript
// Replace this
import { clientService } from '@/services/client.service';

// With this
import { clientApiAdapter as clientService } from '@/services/api';
```

### Step 3: Update Authentication

```typescript
// Replace Firebase auth context usage
import { authApiService } from '@/services/api';

// Create new auth context using Express API
const AuthContext = createContext({
  user: null,
  login: authApiService.login,
  logout: authApiService.logout,
  // ...
});
```

### Step 4: Test and Validate

```typescript
import { MigrationHelper } from '@/services/api';

// Test API connectivity
const connectivity = await MigrationHelper.testConnectivity();
console.log('API Status:', connectivity);

// Compare data between Firebase and Express
const comparison = await MigrationHelper.compareClientData('clientId');
console.log('Data Comparison:', comparison);
```

## Error Handling

The API layer provides comprehensive error handling:

```typescript
try {
  const client = await clientApiService.getClientById('invalid-id');
} catch (error) {
  if (error.message.includes('not found')) {
    // Handle not found
  } else if (error.message.includes('Network')) {
    // Handle network error
  } else {
    // Handle other errors
  }
}
```

### Error Types

- **Authentication Errors**: `401` - Token expired or invalid
- **Authorization Errors**: `403` - User doesn't have permission
- **Validation Errors**: `400` - Invalid request data
- **Not Found Errors**: `404` - Resource not found
- **Conflict Errors**: `409` - Duplicate data or constraint violation
- **Network Errors**: Connection issues, timeouts
- **Server Errors**: `500` - Internal server error

## Advanced Features

### Service Factory

Switch between Firebase and Express API implementations:

```typescript
import { ServiceFactory } from '@/services/api';

// Switch to Express API (default)
ServiceFactory.setApiMode(true);

// Switch to Firebase
ServiceFactory.setApiMode(false);

// Get appropriate service
const clientService = await ServiceFactory.getClientService();
```

### Request Logging

Enable detailed request/response logging in development:

```typescript
// Automatically enabled in development mode
// Check browser console for API call logs
```

### Health Monitoring

Monitor API health:

```typescript
import { checkApiHealth } from '@/services/api/config';

const isHealthy = await checkApiHealth();
if (!isHealthy) {
  console.error('API is not responding');
}
```

## TypeScript Integration

All services are fully typed. Key interfaces:

```typescript
import type { 
  ExpressClient,
  ClientsResponse,
  ClientStatsResponse,
  AuthUser,
  LoginRequest,
  ApiResponse 
} from '@/services/api';

// Express API client interface
interface ExpressClient {
  id: string;
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'ARCHIVED';
  // ... other fields
}

// Firebase compatibility maintained
interface Client {
  id?: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  status: 'active' | 'inactive' | 'prospect';
  // ... other fields
}
```

## Performance Considerations

- **Token Refresh**: Automatic refresh happens 5 minutes before expiry
- **Request Caching**: Consider implementing request caching for frequently accessed data
- **Pagination**: Use pagination for large datasets
- **Debouncing**: Implement debouncing for search operations
- **Optimistic Updates**: Enable optimistic updates for better UX

## Security Features

- **JWT Token Management**: Secure token storage and automatic refresh
- **Request Signing**: All requests include authentication headers
- **HTTPS Enforcement**: API client configured for secure connections
- **Token Expiry**: Automatic handling of expired tokens
- **Logout on Error**: Automatic logout on authentication failures

## Troubleshooting

### Common Issues

1. **Network Errors**: Check API server is running on correct port
2. **CORS Issues**: Ensure CORS is configured on Express server
3. **Token Issues**: Clear localStorage and login again
4. **Type Errors**: Ensure all interfaces are properly imported

### Debug Mode

Enable detailed logging:

```typescript
localStorage.setItem('debug', 'api:*');
```

### Health Checks

```typescript
import { checkApiHealth, clientApiService } from '@/services/api';

// Test API connectivity
const apiHealth = await checkApiHealth();
const clientHealth = await clientApiService.healthCheck();

console.log('API Health:', apiHealth);
console.log('Client Service Health:', clientHealth);
```

## Contributing

When adding new API endpoints:

1. Add interface definitions to appropriate service file
2. Implement API methods in the service class
3. Add adapter methods for Firebase compatibility
4. Update index.ts exports
5. Add tests and documentation
6. Update this README

## Future Enhancements

- **Offline Support**: Cache requests for offline functionality
- **WebSocket Integration**: Real-time updates when Express API supports it
- **Request Optimization**: Implement request deduplication and caching
- **Batch Operations**: Group multiple API calls for efficiency
- **Background Sync**: Queue operations when offline