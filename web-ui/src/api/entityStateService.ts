/**
 * Entity State Service
 *
 * Provides API functions for the centralized INTENT State Model management.
 * This service communicates with the capability service (port 9082) for
 * state operations on capabilities, enablers, and story cards.
 *
 * INTENT State Model - 4 Dimensions:
 * 1. lifecycle_state: draft, active, implemented, maintained, retired
 * 2. workflow_stage: intent, specification, ui_design, implementation, control_loop
 * 3. stage_status: in_progress, ready_for_approval, approved, blocked
 * 4. approval_status: pending, approved, rejected
 */

import { capabilityClient, apiRequest } from './client';

// ============================================================================
// Types
// ============================================================================

export type LifecycleState = 'draft' | 'active' | 'implemented' | 'maintained' | 'retired';
export type WorkflowStage = 'intent' | 'specification' | 'ui_design' | 'implementation' | 'control_loop';
export type StageStatus = 'in_progress' | 'ready_for_approval' | 'approved' | 'blocked';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface EntityStateFields {
  lifecycle_state: LifecycleState;
  workflow_stage: WorkflowStage;
  stage_status: StageStatus;
  approval_status: ApprovalStatus;
  version: number;
  workspace_id: string;
  file_path?: string;
}

export interface CapabilityState extends EntityStateFields {
  id: number;
  capability_id: string;
  name: string;
  status: string;
  description: string;
  purpose: string;
  storyboard_reference: string;
  created_at: string;
  updated_at: string;
  created_by?: number;
  is_active: boolean;
}

export interface EnablerState extends EntityStateFields {
  id: number;
  enabler_id: string;
  capability_id: number;
  name: string;
  description?: string;
  purpose?: string;
  owner?: string;
  priority: string;
  created_at: string;
  updated_at: string;
  created_by?: number;
  is_active: boolean;
}

export interface StoryCardState extends EntityStateFields {
  id: number;
  card_id: string;
  title: string;
  description: string;
  card_type: string;
  image_url?: string;
  position_x: number;
  position_y: number;
  created_at: string;
  updated_at: string;
  created_by?: number;
  is_active: boolean;
}

export interface BulkStateResponse {
  capabilities?: CapabilityState[];
  enablers?: EnablerState[];
  story_cards?: StoryCardState[];
}

export interface EntityStateChange {
  id: number;
  entity_type: string;
  entity_id: string;
  field_changed: string;
  old_value: string;
  new_value: string;
  change_reason?: string;
  changed_by?: number;
  changed_at: string;
  workspace_id?: string;
}

export interface UpdateStateRequest {
  lifecycle_state?: LifecycleState;
  workflow_stage?: WorkflowStage;
  stage_status?: StageStatus;
  approval_status?: ApprovalStatus;
  version: number;
  change_reason?: string;
}

export interface CreateStoryCardRequest {
  card_id: string;
  title: string;
  description: string;
  card_type: string;
  image_url?: string;
  position_x: number;
  position_y: number;
  workspace_id: string;
  file_path?: string;
  lifecycle_state?: LifecycleState;
  workflow_stage?: WorkflowStage;
  stage_status?: StageStatus;
  approval_status?: ApprovalStatus;
}

// ============================================================================
// Workspace State Operations
// ============================================================================

/**
 * Get all entity states for a workspace
 */
export async function getWorkspaceState(workspaceId: string): Promise<BulkStateResponse> {
  return apiRequest<BulkStateResponse>(capabilityClient, {
    method: 'GET',
    url: `/state/workspace/${encodeURIComponent(workspaceId)}`,
  });
}

// ============================================================================
// Capability State Operations
// ============================================================================

/**
 * Get capability state by capability_id (e.g., "CAP-123456")
 */
export async function getCapabilityState(capabilityId: string): Promise<CapabilityState> {
  return apiRequest<CapabilityState>(capabilityClient, {
    method: 'GET',
    url: `/state/capability/${encodeURIComponent(capabilityId)}`,
  });
}

/**
 * Update capability state with optimistic locking
 */
export async function updateCapabilityState(
  capabilityId: string,
  update: UpdateStateRequest
): Promise<CapabilityState> {
  return apiRequest<CapabilityState>(capabilityClient, {
    method: 'PUT',
    url: `/state/capability/${encodeURIComponent(capabilityId)}`,
    data: update,
  });
}

/**
 * Sync capability from file data (upsert)
 */
export async function syncCapabilityFromFile(capability: Partial<CapabilityState>): Promise<CapabilityState> {
  return apiRequest<CapabilityState>(capabilityClient, {
    method: 'POST',
    url: '/state/capability/sync',
    data: capability,
  });
}

// ============================================================================
// Enabler State Operations
// ============================================================================

/**
 * Get enabler state by enabler_id (e.g., "ENB-123456")
 */
export async function getEnablerState(enablerId: string): Promise<EnablerState> {
  return apiRequest<EnablerState>(capabilityClient, {
    method: 'GET',
    url: `/state/enabler/${encodeURIComponent(enablerId)}`,
  });
}

/**
 * Update enabler state with optimistic locking
 */
export async function updateEnablerState(
  enablerId: string,
  update: UpdateStateRequest
): Promise<EnablerState> {
  return apiRequest<EnablerState>(capabilityClient, {
    method: 'PUT',
    url: `/state/enabler/${encodeURIComponent(enablerId)}`,
    data: update,
  });
}

/**
 * Sync enabler from file data (upsert)
 */
export async function syncEnablerFromFile(enabler: Partial<EnablerState>): Promise<EnablerState> {
  return apiRequest<EnablerState>(capabilityClient, {
    method: 'POST',
    url: '/state/enabler/sync',
    data: enabler,
  });
}

// ============================================================================
// Story Card State Operations
// ============================================================================

/**
 * Get story card state by card_id (UUID)
 */
export async function getStoryCardState(cardId: string): Promise<StoryCardState> {
  return apiRequest<StoryCardState>(capabilityClient, {
    method: 'GET',
    url: `/state/storycard/${encodeURIComponent(cardId)}`,
  });
}

/**
 * Update story card state with optimistic locking
 */
export async function updateStoryCardState(
  cardId: string,
  update: UpdateStateRequest
): Promise<StoryCardState> {
  return apiRequest<StoryCardState>(capabilityClient, {
    method: 'PUT',
    url: `/state/storycard/${encodeURIComponent(cardId)}`,
    data: update,
  });
}

/**
 * Create a new story card
 */
export async function createStoryCard(request: CreateStoryCardRequest): Promise<StoryCardState> {
  return apiRequest<StoryCardState>(capabilityClient, {
    method: 'POST',
    url: '/state/storycard',
    data: request,
  });
}

/**
 * Sync story card from file data (upsert - creates if not exists, updates if exists)
 */
export async function syncStoryCardFromFile(storyCard: Partial<StoryCardState>): Promise<StoryCardState> {
  return apiRequest<StoryCardState>(capabilityClient, {
    method: 'POST',
    url: '/state/storycard/sync',
    data: storyCard,
  });
}

// ============================================================================
// State History Operations
// ============================================================================

export interface StateHistoryResponse {
  entity_type: string;
  entity_id: string;
  history: EntityStateChange[];
}

/**
 * Get state change history for an entity
 */
export async function getStateHistory(
  entityType: 'capability' | 'enabler' | 'story_card',
  entityId: string,
  limit?: number
): Promise<StateHistoryResponse> {
  const params = new URLSearchParams();
  if (limit) {
    params.append('limit', limit.toString());
  }

  return apiRequest<StateHistoryResponse>(capabilityClient, {
    method: 'GET',
    url: `/state/history/${entityType}/${encodeURIComponent(entityId)}${params.toString() ? `?${params}` : ''}`,
  });
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if an error is an optimistic lock conflict
 */
export function isOptimisticLockError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.message.includes('concurrent update detected');
  }
  return false;
}

/**
 * Check if an error is a 404 Not Found (entity doesn't exist in database yet)
 */
export function isNotFoundError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.message.includes('404') || error.message.includes('Not Found');
  }
  return false;
}

/**
 * Get default state values for a new entity
 */
export function getDefaultState(): Omit<EntityStateFields, 'version' | 'workspace_id'> {
  return {
    lifecycle_state: 'draft',
    workflow_stage: 'intent',
    stage_status: 'in_progress',
    approval_status: 'pending',
  };
}

/**
 * Validate state transition (basic validation)
 */
export function isValidStateTransition(
  currentState: Partial<EntityStateFields>,
  newState: Partial<UpdateStateRequest>
): { valid: boolean; reason?: string } {
  // Can't go backwards in lifecycle unless retiring
  const lifecycleOrder: LifecycleState[] = ['draft', 'active', 'implemented', 'maintained', 'retired'];

  if (newState.lifecycle_state && currentState.lifecycle_state) {
    const currentIdx = lifecycleOrder.indexOf(currentState.lifecycle_state);
    const newIdx = lifecycleOrder.indexOf(newState.lifecycle_state);

    // Can only go forward or to 'retired' from any state
    if (newIdx < currentIdx && newState.lifecycle_state !== 'retired') {
      return {
        valid: false,
        reason: `Cannot transition lifecycle from ${currentState.lifecycle_state} to ${newState.lifecycle_state}`,
      };
    }
  }

  // Approval status validation
  if (newState.approval_status === 'approved' && currentState.stage_status !== 'ready_for_approval') {
    return {
      valid: false,
      reason: 'Can only approve when stage status is ready_for_approval',
    };
  }

  return { valid: true };
}

// ============================================================================
// Constants
// ============================================================================

export const LIFECYCLE_STATES: LifecycleState[] = [
  'draft',
  'active',
  'implemented',
  'maintained',
  'retired',
];

export const WORKFLOW_STAGES: WorkflowStage[] = [
  'intent',
  'specification',
  'ui_design',
  'implementation',
  'control_loop',
];

export const STAGE_STATUSES: StageStatus[] = [
  'in_progress',
  'ready_for_approval',
  'approved',
  'blocked',
];

export const APPROVAL_STATUSES: ApprovalStatus[] = [
  'pending',
  'approved',
  'rejected',
];

// ============================================================================
// Export/Import Types
// ============================================================================

export interface WorkspaceStateExport {
  version: string;
  exported_at: string;
  workspace_id: string;
  capabilities: CapabilityState[];
  enablers: EnablerState[];
  story_cards: StoryCardState[];
  state_changes?: EntityStateChange[];
}

export interface ImportResult {
  success: boolean;
  imported: {
    capabilities: number;
    enablers: number;
    story_cards: number;
  };
  workspace_id: string;
}

// ============================================================================
// Export/Import Operations
// ============================================================================

/**
 * Export all entity states for a workspace as a downloadable JSON file
 */
export async function exportWorkspaceState(workspaceId: string, includeHistory = false): Promise<WorkspaceStateExport> {
  const params = new URLSearchParams();
  if (includeHistory) {
    params.append('include_history', 'true');
  }

  return apiRequest<WorkspaceStateExport>(capabilityClient, {
    method: 'GET',
    url: `/state/export/${encodeURIComponent(workspaceId)}${params.toString() ? `?${params}` : ''}`,
  });
}

/**
 * Import entity states into a workspace from an exported JSON file
 */
export async function importWorkspaceState(workspaceId: string, data: WorkspaceStateExport): Promise<ImportResult> {
  return apiRequest<ImportResult>(capabilityClient, {
    method: 'POST',
    url: `/state/import/${encodeURIComponent(workspaceId)}`,
    data,
  });
}

/**
 * Download workspace state as a file
 */
export function downloadWorkspaceStateAsFile(data: WorkspaceStateExport, filename?: string): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `workspace_${data.workspace_id}_state_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Human-readable labels for state values
 */
export const STATE_LABELS = {
  lifecycle_state: {
    draft: 'Draft',
    active: 'Active',
    implemented: 'Implemented',
    maintained: 'Maintained',
    retired: 'Retired',
  },
  workflow_stage: {
    intent: 'Intent',
    specification: 'Specification',
    ui_design: 'UI Design',
    implementation: 'Implementation',
    control_loop: 'Control Loop',
  },
  stage_status: {
    in_progress: 'In Progress',
    ready_for_approval: 'Ready for Approval',
    approved: 'Approved',
    blocked: 'Blocked',
  },
  approval_status: {
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
  },
};
