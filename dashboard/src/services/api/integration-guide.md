# Integration Guide: Migrating to Express API

This guide shows how to integrate the new Express API service layer into your existing React dashboard application.

## Quick Migration Checklist

- ✅ Axios dependency installed
- ✅ API service layer created
- ✅ JWT authentication implemented
- ✅ Firebase compatibility adapter ready
- ✅ Error handling and retry logic included
- ✅ TypeScript support provided

## Step-by-Step Integration

### 1. Update Environment Configuration

Add these environment variables to your `.env` file:

```env
# API Configuration
REACT_APP_API_BASE_URL=http://localhost:3000/api/v1
REACT_APP_API_TIMEOUT=30000

# Feature Flags
REACT_APP_USE_EXPRESS_API=true
REACT_APP_ENABLE_API_LOGGING=true
```

### 2. Replace Authentication Context

Update your `AuthContext.tsx` to use the new Express API:

```typescript
// src/contexts/AuthContext.tsx
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { authApiService, AuthUser } from '../services/api';

interface AuthContextType {
  currentUser: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (authApiService.isAuthenticated()) {
          const user = await authApiService.getCurrentUser();
          setCurrentUser(user);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        authApiService.logout(); // Clear invalid tokens
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Listen for auth events
    const handleTokenExpired = () => {
      setCurrentUser(null);
    };

    const handleLogout = () => {
      setCurrentUser(null);
    };

    window.addEventListener('auth:token-expired', handleTokenExpired);
    window.addEventListener('auth:logout', handleLogout);

    return () => {
      window.removeEventListener('auth:token-expired', handleTokenExpired);
      window.removeEventListener('auth:logout', handleLogout);
    };
  }, []);

  const login = async (email: string, password: string): Promise<AuthUser> => {
    const user = await authApiService.login({ email, password });
    setCurrentUser(user);
    return user;
  };

  const logout = async () => {
    await authApiService.logout();
    setCurrentUser(null);
  };

  const resetPassword = async (email: string) => {
    await authApiService.forgotPassword({ email });
  };

  const value: AuthContextType = {
    currentUser,
    loading,
    login,
    logout,
    resetPassword,
    isAuthenticated: authApiService.isAuthenticated(),
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
```

### 3. Update Client Service Usage

For existing components, you have two options:

#### Option A: Drop-in Replacement (Recommended)

Simply replace the import in your existing client components:

```typescript
// Before
import { clientService } from '../services/client.service';

// After (no other changes needed!)
import { clientApiAdapter as clientService } from '../services/api';
```

#### Option B: Direct API Usage

For new components or when you want full control:

```typescript
import { clientApiService } from '../services/api';

// Use Express API directly
const clients = await clientApiService.getClients({
  status: 'ACTIVE',
  search: 'john',
  page: 1,
  limit: 10
});
```

### 4. Update Login Component

Update your login component to use the new auth service:

```typescript
// src/components/Login.tsx
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(email, password);
      // Navigation handled by auth context
    } catch (error: any) {
      setError(error.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
      />
      {error && <div className="error">{error}</div>}
      <button type="submit" disabled={loading}>
        {loading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
};
```

### 5. Update Existing Client Components

Your existing client components should work without changes if you use the adapter. Here's an example:

```typescript
// src/components/ClientsList.tsx - NO CHANGES NEEDED
import React, { useState, useEffect } from 'react';
import { clientApiAdapter as clientService } from '../services/api'; // Only change this line
import { useAuth } from '../contexts/AuthContext';

export const ClientsList: React.FC = () => {
  const { currentUser } = useAuth();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadClients = async () => {
      try {
        const result = await clientService.getClients(
          currentUser?.companyId,
          { status: 'active' }
        );
        setClients(result.clients);
      } catch (error) {
        console.error('Error loading clients:', error);
      } finally {
        setLoading(false);
      }
    };

    if (currentUser) {
      loadClients();
    }
  }, [currentUser]);

  // Rest of component unchanged...
  return (
    <div>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div>
          {clients.map(client => (
            <div key={client.id}>
              {client.firstName} {client.lastName}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
```

### 6. Handle Real-time Updates

Since Express API doesn't support real-time WebSocket updates like Firebase, the adapter uses polling. You can adjust the polling interval:

```typescript
// src/services/api/config.ts
export const API_SERVICE_CONFIG = {
  // Adjust polling interval (default: 30 seconds)
  POLLING_INTERVAL: 10000, // 10 seconds for more responsive updates
  // ...
};
```

For critical real-time features, consider implementing WebSocket support in your Express backend.

### 7. Error Handling

The API layer provides comprehensive error handling. Update your components to handle new error types:

```typescript
import { clientApiService } from '../services/api';

const handleApiCall = async () => {
  try {
    const result = await clientApiService.getClients();
    // Handle success
  } catch (error: any) {
    // Error handling is more granular now
    switch (true) {
      case error.message.includes('Network'):
        // Show network error message
        setError('Please check your internet connection');
        break;
      case error.message.includes('401'):
        // Token expired - auth context will handle redirect
        break;
      case error.message.includes('403'):
        setError('You do not have permission for this action');
        break;
      case error.message.includes('404'):
        setError('Resource not found');
        break;
      default:
        setError(error.message || 'An error occurred');
    }
  }
};
```

### 8. Testing the Migration

Add a test component to verify everything is working:

```typescript
// src/components/ApiTest.tsx
import React, { useState } from 'react';
import { MigrationHelper, checkApiHealth } from '../services/api';

export const ApiTest: React.FC = () => {
  const [results, setResults] = useState<any>(null);

  const testConnectivity = async () => {
    const connectivity = await MigrationHelper.testConnectivity();
    const health = await checkApiHealth();
    
    setResults({
      connectivity,
      health,
      timestamp: new Date().toISOString(),
    });
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', margin: '10px' }}>
      <h3>API Connection Test</h3>
      <button onClick={testConnectivity}>Test API Connection</button>
      
      {results && (
        <div style={{ marginTop: '20px' }}>
          <h4>Test Results:</h4>
          <pre style={{ background: '#f5f5f5', padding: '10px' }}>
            {JSON.stringify(results, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};
```

### 9. Environment-based API Switching

You can switch between Firebase and Express API based on environment:

```typescript
// src/services/index.ts
import { ServiceFactory } from './api';

// Switch based on environment variable
const useExpressAPI = process.env.REACT_APP_USE_EXPRESS_API === 'true';
ServiceFactory.setApiMode(useExpressAPI);

// Export the appropriate service
export const clientService = useExpressAPI 
  ? (await import('./api')).clientApiAdapter
  : (await import('./client.service')).clientService;
```

### 10. Performance Optimization

Consider these optimizations:

```typescript
// src/hooks/useClients.ts
import { useState, useEffect, useCallback } from 'react';
import { clientApiAdapter } from '../services/api';

export const useClients = (companyId: string, filters?: any) => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Debounced search
  const [debouncedFilters, setDebouncedFilters] = useState(filters);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilters(filters);
    }, 300);

    return () => clearTimeout(timer);
  }, [filters]);

  const loadClients = useCallback(async () => {
    if (!companyId) return;

    try {
      setLoading(true);
      const result = await clientApiAdapter.getClients(
        companyId, 
        debouncedFilters
      );
      setClients(result.clients);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [companyId, debouncedFilters]);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  return { clients, loading, error, refresh: loadClients };
};
```

## Rollback Plan

If you need to rollback to Firebase:

1. Change environment variable: `REACT_APP_USE_EXPRESS_API=false`
2. Revert auth context changes
3. Change service imports back to Firebase

The adapter layer ensures your components work with both systems.

## Monitoring and Debugging

### Enable Debug Logging

```typescript
// In development, enable detailed logging
if (process.env.NODE_ENV === 'development') {
  localStorage.setItem('debug', 'api:*');
}
```

### API Health Dashboard

Create a simple dashboard to monitor API health:

```typescript
// src/components/ApiHealthDashboard.tsx
import React, { useState, useEffect } from 'react';
import { checkApiHealth, clientApiService } from '../services/api';

export const ApiHealthDashboard: React.FC = () => {
  const [status, setStatus] = useState({
    api: false,
    client: false,
    auth: false,
    lastCheck: null as Date | null,
  });

  useEffect(() => {
    const checkStatus = async () => {
      const api = await checkApiHealth();
      const client = await clientApiService.healthCheck();
      // const auth = await authApiService.verifySession(); // if implemented
      
      setStatus({
        api,
        client,
        auth: true, // placeholder
        lastCheck: new Date(),
      });
    };

    checkStatus();
    const interval = setInterval(checkStatus, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ padding: '20px' }}>
      <h3>API Health Status</h3>
      <div>
        <div>API Health: {status.api ? '✅ Healthy' : '❌ Unhealthy'}</div>
        <div>Client Service: {status.client ? '✅ Healthy' : '❌ Unhealthy'}</div>
        <div>Auth Service: {status.auth ? '✅ Healthy' : '❌ Unhealthy'}</div>
        <div>Last Check: {status.lastCheck?.toLocaleTimeString()}</div>
      </div>
    </div>
  );
};
```

## Common Issues and Solutions

### Issue: CORS Errors
**Solution**: Ensure your Express API has CORS configured for your frontend domain.

### Issue: Token Not Persisting
**Solution**: Check that localStorage is working and tokens are being saved correctly.

### Issue: Real-time Updates Not Working
**Solution**: Remember that Express API uses polling. Adjust the polling interval if needed.

### Issue: Type Errors
**Solution**: Ensure you're importing the correct interfaces from the API service layer.

### Issue: Network Timeouts
**Solution**: Increase the timeout in API configuration or check your network connection.

This completes the integration guide. Your dashboard should now be ready to use the Express API while maintaining full backward compatibility with your existing Firebase-based components.