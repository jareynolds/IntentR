/**
 * Centralized API Service
 *
 * This module provides a unified interface for all API calls.
 * It uses relative URLs that work with the nginx reverse proxy,
 * making the code portable across different environments.
 */

import axios from 'axios';
import type { AxiosRequestConfig, AxiosResponse } from 'axios';

// API base paths - these are relative URLs that nginx routes to the correct services
export const API_PATHS = {
  integration: '/api/integration',
  design: '/api/design',
  capability: '/api/capability',
  auth: '/api/auth',
  spec: '/api/spec',
  workspace: '/api/workspace',
} as const;

// Create axios instance with common configuration
const apiClient = axios.create({
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add authorization token to all requests if available
apiClient.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized - could redirect to login
      console.warn('Unauthorized request');
    }
    return Promise.reject(error);
  }
);

/**
 * Generic API request function
 */
async function apiRequest<T>(config: AxiosRequestConfig): Promise<T> {
  try {
    const response: AxiosResponse<T> = await apiClient.request(config);
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

// ============================================================================
// Integration Service API
// ============================================================================

export const integrationApi = {
  // Workspace operations
  scanWorkspaces: () =>
    apiRequest<{ workspaces: any[] }>({ method: 'GET', url: `${API_PATHS.integration}/workspace-config/scan` }),

  saveWorkspaceConfig: (config: any) =>
    apiRequest({ method: 'POST', url: `${API_PATHS.integration}/workspace-config/save`, data: { config } }),

  // Folder operations
  listFolders: (path: string) =>
    apiRequest<{ items: any[]; parentPath: string; currentPath: string }>({
      method: 'GET',
      url: `${API_PATHS.integration}/folders/list`,
      params: { path },
    }),

  createFolder: (path: string, name: string) =>
    apiRequest({ method: 'POST', url: `${API_PATHS.integration}/folders/create`, data: { path, name } }),

  ensureWorkspaceStructure: (path: string) =>
    apiRequest({ method: 'POST', url: `${API_PATHS.integration}/folders/ensure-workspace-structure`, data: { path } }),

  // Capability operations
  getCapabilityFiles: (workspacePath: string) =>
    apiRequest<{ capabilities: any[] }>({
      method: 'POST',
      url: `${API_PATHS.integration}/capability-files`,
      data: { workspacePath },
    }),

  saveCapability: (data: { path: string; name: string; description: string; content: string }) =>
    apiRequest({ method: 'POST', url: `${API_PATHS.integration}/save-capability`, data }),

  deleteCapability: (path: string) =>
    apiRequest({ method: 'POST', url: `${API_PATHS.integration}/delete-capability`, data: { path } }),

  // Enabler operations
  getEnablerFiles: (workspacePath: string) =>
    apiRequest<{ enablers: any[] }>({
      method: 'POST',
      url: `${API_PATHS.integration}/enabler-files`,
      data: { workspacePath },
    }),

  // Feature operations
  getFeatureFiles: (workspacePath: string) =>
    apiRequest<{ features: any[] }>({
      method: 'POST',
      url: `${API_PATHS.integration}/feature-files`,
      data: { workspacePath },
    }),

  saveFeature: (data: any) =>
    apiRequest({ method: 'POST', url: `${API_PATHS.integration}/save-feature`, data }),

  deleteFeature: (path: string) =>
    apiRequest({ method: 'POST', url: `${API_PATHS.integration}/delete-feature`, data: { path } }),

  // Theme operations
  getThemeFiles: (workspacePath: string) =>
    apiRequest<{ themes: any[] }>({
      method: 'POST',
      url: `${API_PATHS.integration}/theme-files`,
      data: { workspacePath },
    }),

  saveTheme: (data: any) =>
    apiRequest({ method: 'POST', url: `${API_PATHS.integration}/save-theme`, data }),

  deleteTheme: (path: string) =>
    apiRequest({ method: 'POST', url: `${API_PATHS.integration}/delete-theme`, data: { path } }),

  // Storyboard operations
  readStoryboardFiles: (workspacePath: string) =>
    apiRequest<{ files: any[] }>({
      method: 'POST',
      url: `${API_PATHS.integration}/read-storyboard-files`,
      data: { workspacePath },
    }),

  analyzeStoryboard: (data: any) =>
    apiRequest({ method: 'POST', url: `${API_PATHS.integration}/analyze-storyboard`, data }),

  // Specification operations
  listSpecifications: (workspace: string) =>
    apiRequest<{ files: any[] }>({
      method: 'GET',
      url: `${API_PATHS.integration}/specifications/list`,
      params: { workspace },
    }),

  saveSpecifications: (data: { workspacePath: string; files: any[]; subfolder?: string }) =>
    apiRequest({ method: 'POST', url: `${API_PATHS.integration}/save-specifications`, data }),

  readSpecification: (data: { workspacePath: string; fileName: string; subfolder?: string }) =>
    apiRequest({ method: 'POST', url: `${API_PATHS.integration}/read-specification`, data }),

  deleteSpecification: (data: { workspacePath: string; fileName: string; subfolder?: string }) =>
    apiRequest({ method: 'POST', url: `${API_PATHS.integration}/delete-specification`, data }),

  analyzeSpecifications: (data: any) =>
    apiRequest({ method: 'POST', url: `${API_PATHS.integration}/specifications/analyze`, data }),

  generateDiagram: (data: any) =>
    apiRequest({ method: 'POST', url: `${API_PATHS.integration}/specifications/generate-diagram`, data }),

  // AI operations
  aiChat: (data: any) =>
    apiRequest({ method: 'POST', url: `${API_PATHS.integration}/ai-chat`, data }),

  analyzeCapabilities: (data: any) =>
    apiRequest({ method: 'POST', url: `${API_PATHS.integration}/analyze-capabilities`, data }),

  analyzeIntegration: (data: any) =>
    apiRequest({ method: 'POST', url: `${API_PATHS.integration}/analyze-integration`, data }),

  // Figma/Integration operations
  fetchResources: (data: any) =>
    apiRequest({ method: 'POST', url: `${API_PATHS.integration}/fetch-resources`, data }),

  fetchFiles: (data: any) =>
    apiRequest({ method: 'POST', url: `${API_PATHS.integration}/fetch-files`, data }),

  fetchTeamFiles: (data: any) =>
    apiRequest({ method: 'POST', url: `${API_PATHS.integration}/fetch-team-files`, data }),

  fetchFileMeta: (data: any) =>
    apiRequest({ method: 'POST', url: `${API_PATHS.integration}/fetch-file-meta`, data }),

  suggestResources: (data: any) =>
    apiRequest({ method: 'POST', url: `${API_PATHS.integration}/suggest-resources`, data }),

  // Image operations
  saveImage: (data: any) =>
    apiRequest({ method: 'POST', url: `${API_PATHS.integration}/save-image`, data }),

  // Run operations
  runApp: (data: any) =>
    apiRequest({ method: 'POST', url: `${API_PATHS.integration}/run-app`, data }),

  stopApp: (data: any) =>
    apiRequest({ method: 'POST', url: `${API_PATHS.integration}/stop-app`, data }),
};

// ============================================================================
// Specification API (Node.js service on port 4001)
// ============================================================================

export const specApi = {
  saveSpecification: (data: any) =>
    apiRequest({ method: 'POST', url: `${API_PATHS.spec}/save-specification`, data }),

  deleteSpecification: (data: any) =>
    apiRequest({ method: 'POST', url: `${API_PATHS.spec}/delete-specification`, data }),

  getSpecification: (workspace: string, fileName: string) =>
    apiRequest({
      method: 'GET',
      url: `${API_PATHS.spec}/specification`,
      params: { workspace, fileName },
    }),
};

// ============================================================================
// Workspace API (Node.js service on port 4002)
// ============================================================================

export const workspaceApi = {
  getSharedWorkspaces: (userEmail: string) =>
    apiRequest<{ workspaces: any[] }>({
      method: 'GET',
      url: `${API_PATHS.workspace}/shared-workspaces`,
      params: { userEmail },
    }),

  shareWorkspace: (workspace: any) =>
    apiRequest({ method: 'POST', url: `${API_PATHS.workspace}/shared-workspaces`, data: { workspace } }),

  updateSharedWorkspace: (id: string, workspace: any) =>
    apiRequest({ method: 'PUT', url: `${API_PATHS.workspace}/shared-workspaces/${id}`, data: { workspace } }),

  unshareWorkspace: (id: string, userEmail: string) =>
    apiRequest({
      method: 'DELETE',
      url: `${API_PATHS.workspace}/shared-workspaces/${id}`,
      params: { userEmail },
    }),
};

// ============================================================================
// Auth API
// ============================================================================

export const authApi = {
  login: (email: string, password: string) =>
    apiRequest<{ token: string; user: any }>({
      method: 'POST',
      url: `${API_PATHS.auth}/login`,
      data: { email, password },
    }),

  register: (data: { email: string; password: string; name: string }) =>
    apiRequest<{ token: string; user: any }>({
      method: 'POST',
      url: `${API_PATHS.auth}/register`,
      data,
    }),

  me: () =>
    apiRequest<{ user: any }>({ method: 'GET', url: `${API_PATHS.auth}/me` }),

  logout: () =>
    apiRequest({ method: 'POST', url: `${API_PATHS.auth}/logout` }),
};

// ============================================================================
// Capability Service API
// ============================================================================

export const capabilityApi = {
  getCapabilities: () =>
    apiRequest<any[]>({ method: 'GET', url: `${API_PATHS.capability}/capabilities` }),

  getCapability: (id: string) =>
    apiRequest<any>({ method: 'GET', url: `${API_PATHS.capability}/capabilities/${id}` }),

  createCapability: (data: any) =>
    apiRequest({ method: 'POST', url: `${API_PATHS.capability}/capabilities`, data }),

  updateCapability: (id: string, data: any) =>
    apiRequest({ method: 'PUT', url: `${API_PATHS.capability}/capabilities/${id}`, data }),

  deleteCapability: (id: string) =>
    apiRequest({ method: 'DELETE', url: `${API_PATHS.capability}/capabilities/${id}` }),

  // Approval operations
  requestApproval: (data: any) =>
    apiRequest({ method: 'POST', url: `${API_PATHS.capability}/approvals/request`, data }),

  getPendingApprovals: () =>
    apiRequest<any[]>({ method: 'GET', url: `${API_PATHS.capability}/approvals/pending` }),

  approveRequest: (id: string, data?: any) =>
    apiRequest({ method: 'POST', url: `${API_PATHS.capability}/approvals/${id}/approve`, data }),

  rejectRequest: (id: string, data: { feedback: string }) =>
    apiRequest({ method: 'POST', url: `${API_PATHS.capability}/approvals/${id}/reject`, data }),

  getApprovalHistory: (capabilityId: string) =>
    apiRequest<any[]>({ method: 'GET', url: `${API_PATHS.capability}/capabilities/${capabilityId}/approvals` }),
};

// Export the axios client for cases where direct access is needed
export { apiClient };

// Default export for convenience
export default {
  integration: integrationApi,
  spec: specApi,
  workspace: workspaceApi,
  auth: authApi,
  capability: capabilityApi,
};
