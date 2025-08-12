# API Common Errors and Solutions

## 1. Route Returns 404 "Service not found" Despite Route Being Defined

### Error Symptoms
- API endpoint returns 404 with error message like "Service not found" or similar entity-specific message
- The route is clearly defined in the routes file
- Authentication passes successfully but the handler is never called

### Example
```
GET /api/v1/services/categories → 404 "Service not found"
GET /api/v1/services/health → 404 "Service not found"
```

### Root Cause
Express route matching issue where a dynamic parameter route (e.g., `/:id`) is defined BEFORE static routes (e.g., `/categories`). Express matches routes in the order they are defined, so `/categories` gets matched as an ID parameter.

### Solution
Reorder routes in the route file to place all static routes BEFORE dynamic parameter routes:

```typescript
// CORRECT ORDER
router.get('/categories', controller.getCategories);  // Static route first
router.get('/health', controller.healthCheck);        // Static route
router.get('/:id', controller.getById);              // Dynamic route last

// WRONG ORDER (causes 404)
router.get('/:id', controller.getById);              // This will match everything!
router.get('/categories', controller.getCategories);  // Never reached
```

### Prevention
Always organize routes in this order:
1. Static routes (exact paths like `/categories`, `/health`)
2. Routes with specific prefixes (`/by-staff/:staffId`)
3. Dynamic parameter routes (`/:id`) at the end

### Files Affected
- `src/routes/service.routes.ts`
- Any route file with dynamic parameters

---

## 2. Authorization Header Not Being Sent with API Requests

### Error Symptoms
- API returns 401 Unauthorized despite user being logged in
- Token exists in localStorage but not included in requests
- Some API calls work while others don't

### Root Cause
Multiple API configurations or service files using their own axios instances instead of the centralized API client with interceptors.

### Solution
Ensure all API service files import and use the main API client:

```typescript
// CORRECT
import apiClient from '../../config/api';

// WRONG - creates separate axios instance
import axios from 'axios';
const apiClient = axios.create({...});
```

### Files to Check
- All files in `src/services/api/` directory
- Ensure they import from `../../config/api`

---

## 3. CORS Errors Despite CORS Being Configured

### Error Symptoms
- Browser shows CORS policy errors
- Preflight OPTIONS requests fail
- Works in Postman but not in browser

### Root Cause
- Frontend and backend running on different ports
- CORS origin not properly configured
- Credentials not included in requests

### Solution
1. Check backend CORS configuration allows frontend origin
2. Ensure credentials are included in frontend requests
3. Verify allowed headers include Authorization

```typescript
// Backend CORS config
cors({
  origin: ['http://localhost:3000'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
})

// Frontend API config
axios.defaults.withCredentials = true;
```

---

## 4. Token Expired Immediately After Login

### Error Symptoms
- User logs in successfully
- First API call works
- Subsequent calls return "Token expired"

### Root Cause
- Token expiry time too short
- Clock skew between client and server
- Token not being refreshed

### Solution
1. Check token expiry configuration
2. Implement token refresh mechanism
3. Ensure server time is synchronized

---

## 5. Firebase Auth Methods Called on API User Object

### Error Symptoms
- `TypeError: currentUser.getIdTokenResult is not a function`
- `TypeError: currentUser.uid is undefined`
- Components trying to use Firebase auth methods after migration to API

### Root Cause
Frontend components still using Firebase authentication methods after migration to API-based authentication. The API user object has different properties than Firebase User.

### Solution
Replace Firebase auth calls with direct property access:

```typescript
// WRONG - Firebase method
const idTokenResult = await currentUser.getIdTokenResult();
const companyId = idTokenResult.claims.companyId;

// CORRECT - API user object
const companyId = currentUser.companyId;

// WRONG - Firebase property
const userId = currentUser.uid;

// CORRECT - API user object  
const userId = currentUser.id;
```

### Common Firebase to API Mappings
- `currentUser.uid` → `currentUser.id`
- `currentUser.getIdTokenResult()` → Not needed, claims are on user object
- `currentUser.displayName` → `currentUser.displayName || ${currentUser.firstName} ${currentUser.lastName}`
- `currentUser.photoURL` → `currentUser.photoURL`

### Files Commonly Affected
- Components in `/src/components/` that interact with auth
- Service files in `/src/services/` that were using Firebase
- Context providers that manage user state

---

## 6. "Missing or insufficient permissions" on Empty Collections

### Error Symptoms
- Firestore queries fail on empty collections
- Works when collection has data
- Security rules seem correct

### Root Cause
Security rules checking `resource.data` fail when no documents exist.

### Solution
Update security rules to handle empty collections:

```javascript
// Add hasCompanyId() check for empty collections
allow read: if isAuthenticated() && 
  (hasCompanyId() || belongsToCompany(resource.data.companyId));
```