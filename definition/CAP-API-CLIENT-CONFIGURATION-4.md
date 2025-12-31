# Capability: API Client Configuration

## Metadata
- **ID**: CAP-100004
- **Name**: API Client Configuration
- **Type**: Capability
- **Component**: IntentR Web UI
- **Status**: Implemented
- **Approval**: Approved
- **Priority**: High
- **Last Updated**: 2025-12-30

## Business Context

### Purpose
Provide a centralized API client configuration system that supports both development (direct URLs) and production (nginx proxy) modes. This capability ensures consistent API access across all frontend components while enabling flexible deployment configurations.

### Business Value
- Single configuration point for all API clients
- Seamless transition between development and production
- Consistent authentication handling
- Simplified debugging and maintenance

### Users
- Frontend developers integrating with APIs
- DevOps engineers configuring deployments
- QA engineers testing different environments

## Functional Description

### Core Features
1. **Dual Mode Support** - Proxy (nginx) and Direct URL modes
2. **Service Client Factory** - Create axios instances for each service
3. **Authentication Injection** - Auto-attach JWT tokens to requests
4. **URL Building** - Construct full URLs for fetch calls
5. **WebSocket URL Resolution** - Handle collaboration server connections

### Configuration Modes

#### Proxy Mode (Production)
- All requests go through nginx on port 80
- Nginx routes based on path prefix
- Single origin for all API calls

#### Direct Mode (Development)
- Direct connections to individual services
- Configurable via environment variables
- Allows mixed local/remote services

## Scope

### In Scope
- Axios client creation for each service
- JWT token injection via interceptors
- Environment-based URL configuration
- URL building helpers
- WebSocket URL resolution

### Out of Scope
- Request retry logic
- Response caching
- Request queuing
- Offline support

## Dependencies

### Upstream Dependencies
| Dependency | Type | Description |
|------------|------|-------------|
| Vite Environment | Build | VITE_* env variables |
| sessionStorage | Browser | Auth token storage |

### Downstream Dependencies
| Dependency | Type | Description |
|------------|------|-------------|
| All page components | Import | Use exported clients |
| Context providers | Import | Use API clients |

## Enablers

| Enabler ID | Name | Description | Status |
|------------|------|-------------|--------|
| ENB-100030 | Create Service Clients | Factory for axios instances | Implemented |
| ENB-100031 | Inject Authentication | Add JWT to all requests | Implemented |
| ENB-100032 | Build Service URLs | Construct full URLs | Implemented |

## Acceptance Criteria

### AC-1: Proxy Mode
**Given** VITE_USE_PROXY=true
**When** any API client makes a request
**Then** the request uses relative URLs
**And** nginx routes to the correct service

### AC-2: Direct Mode
**Given** VITE_USE_PROXY=false
**When** any API client makes a request
**Then** the request uses the configured service URL
**And** can be overridden via VITE_*_URL variables

### AC-3: Authentication
**Given** a JWT token in sessionStorage
**When** any API request is made
**Then** the Authorization header is set with Bearer token

### AC-4: WebSocket URL
**Given** proxy mode is enabled
**When** getCollaborationUrl is called
**Then** returns window.location.origin
**Otherwise** returns configured collaboration server URL

## Technical Specifications

### Service Configuration

```typescript
// Proxy mode paths (empty - nginx routes by path)
const PROXY_PATHS = {
  integration: '',
  design: '',
  capability: '',
  auth: '',
  spec: '',
  workspace: '',
  collaboration: '',
  claudeProxy: '',
};

// Direct mode URLs
const DIRECT_URLS = {
  integration: import.meta.env.VITE_INTEGRATION_SERVICE_URL || 'http://localhost:9080',
  design: import.meta.env.VITE_DESIGN_SERVICE_URL || 'http://localhost:9081',
  capability: import.meta.env.VITE_CAPABILITY_SERVICE_URL || 'http://localhost:9082',
  auth: import.meta.env.VITE_AUTH_SERVICE_URL || 'http://localhost:9083',
  spec: import.meta.env.VITE_SPECIFICATION_API_URL || 'http://localhost:4001',
  workspace: import.meta.env.VITE_SHARED_WORKSPACE_URL || 'http://localhost:4002',
  collaboration: import.meta.env.VITE_COLLABORATION_SERVER_URL || 'http://localhost:9084',
  claudeProxy: import.meta.env.VITE_CLAUDE_PROXY_URL || 'http://localhost:9085',
};
```

### Client Factory

```typescript
const createClient = (baseURL: string): AxiosInstance => {
  return axios.create({
    baseURL,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
    },
  });
};
```

### Authentication Interceptor

```typescript
[integrationClient, designClient, ...].forEach((client) => {
  client.interceptors.request.use((config) => {
    // sessionStorage for tab-specific auth
    const token = sessionStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });
});
```

### URL Building Helper

```typescript
export function buildUrl(service: keyof typeof BASE_URLS, path: string): string {
  const baseUrl = BASE_URLS[service];
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
}
```

### WebSocket URL Helper

```typescript
export function getCollaborationUrl(): string {
  if (USE_PROXY) {
    return window.location.origin;
  }
  return COLLABORATION_URL;
}
```

### Exported Clients

```typescript
export const integrationClient = createClient(BASE_URLS.integration);
export const designClient = createClient(BASE_URLS.design);
export const capabilityClient = createClient(BASE_URLS.capability);
export const authClient = createClient(BASE_URLS.auth);
export const specClient = createClient(BASE_URLS.spec);
export const workspaceClient = createClient(BASE_URLS.workspace);
```

## Implementation Files

| File | Purpose |
|------|---------|
| `web-ui/src/api/client.ts` | Client configuration and factory |
| `web-ui/.env.development` | Development environment variables |
| `nginx/nginx.conf` | Proxy routing configuration |
