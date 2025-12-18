import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';

/**
 * API Client Configuration
 *
 * This module supports two modes:
 * 1. Proxy mode (production): Uses relative URLs that nginx routes to correct services
 * 2. Direct mode (development): Uses absolute URLs to connect directly to services
 *
 * The mode is determined by VITE_USE_PROXY environment variable.
 * When using the proxy, all requests go through nginx on port 80.
 */

// Check if we're using the nginx proxy
const USE_PROXY = import.meta.env.VITE_USE_PROXY === 'true';

// API paths for proxy mode (relative URLs)
const PROXY_PATHS = {
  integration: '/api/integration',
  design: '/api/design',
  capability: '/api/capability',
  auth: '/api/auth',
  spec: '/api/spec',
  workspace: '/api/workspace',
  collaboration: '', // WebSocket handled separately
  claudeProxy: '/api/claude-proxy', // Host-side service for executing scripts
};

// Direct URLs for development mode
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

// Base URLs - automatically selects based on mode
export const BASE_URLS = USE_PROXY ? PROXY_PATHS : DIRECT_URLS;

// Export individual URLs for backward compatibility
export const INTEGRATION_URL = BASE_URLS.integration;
export const DESIGN_URL = BASE_URLS.design;
export const CAPABILITY_URL = BASE_URLS.capability;
export const AUTH_URL = BASE_URLS.auth;
export const SPEC_URL = BASE_URLS.spec;
export const WORKSPACE_URL = BASE_URLS.workspace;
export const COLLABORATION_URL = BASE_URLS.collaboration;
export const CLAUDE_PROXY_URL = BASE_URLS.claudeProxy;

// Create axios instances for each service
const createClient = (baseURL: string): AxiosInstance => {
  return axios.create({
    baseURL,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

export const integrationClient = createClient(BASE_URLS.integration);
export const designClient = createClient(BASE_URLS.design);
export const capabilityClient = createClient(BASE_URLS.capability);
export const authClient = createClient(BASE_URLS.auth);
export const specClient = createClient(BASE_URLS.spec);
export const workspaceClient = createClient(BASE_URLS.workspace);

// Add authorization token to all requests if available
// Use sessionStorage for tab-specific authentication (allows multiple users in different tabs)
[integrationClient, designClient, capabilityClient, authClient, specClient, workspaceClient].forEach((client) => {
  client.interceptors.request.use((config) => {
    const token = sessionStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });
});

// Generic request wrapper with error handling
export async function apiRequest<T>(
  client: AxiosInstance,
  config: AxiosRequestConfig
): Promise<T> {
  try {
    const response = await client.request<T>(config);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message || error.message || 'An error occurred'
      );
    }
    throw error;
  }
}

/**
 * Helper function to get the WebSocket URL for collaboration
 * In proxy mode, this uses the same origin
 * In direct mode, this uses the configured collaboration server URL
 */
export function getCollaborationUrl(): string {
  if (USE_PROXY) {
    // In proxy mode, use the current origin (nginx handles the routing)
    return window.location.origin;
  }
  return COLLABORATION_URL;
}

/**
 * Helper to build full URL for fetch calls
 * This ensures compatibility during the transition period
 */
export function buildUrl(service: keyof typeof BASE_URLS, path: string): string {
  const baseUrl = BASE_URLS[service];
  // Remove leading slash from path if base URL already has trailing content
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
}
