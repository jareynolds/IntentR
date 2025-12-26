import { capabilityClient, apiRequest, SPEC_URL } from './client';

// ========================
// INTENT State Model Types (aligned with STATE_MODEL.md)
// ========================

// Lifecycle State - Where is this in its overall life?
export type LifecycleState =
  | 'draft'
  | 'active'
  | 'implemented'
  | 'maintained'
  | 'retired';

// Workflow Stage - Which of the 5 stages is it in? (only when lifecycle_state = 'active')
export type WorkflowStage =
  | 'intent'
  | 'specification'
  | 'ui_design'
  | 'implementation'
  | 'control_loop';

// Stage Status - Progress within current stage
export type StageStatus =
  | 'in_progress'
  | 'ready_for_approval'
  | 'approved'
  | 'blocked';

// Approval Status - Authorization decision
export type ApprovalStatus =
  | 'pending'
  | 'approved'
  | 'rejected';

export type Priority =
  | 'high'
  | 'medium'
  | 'low';

// Legacy type aliases for backward compatibility during migration
export type EnablerStatus = LifecycleState;
export type EnablerApprovalStatus = ApprovalStatus;

export interface Enabler {
  id: number;
  enabler_id: string;
  capability_id: number;
  name: string;
  purpose?: string;
  owner?: string;
  // INTENT State Model - 4 dimensions
  lifecycle_state: LifecycleState;
  workflow_stage: WorkflowStage;
  stage_status: StageStatus;
  approval_status: ApprovalStatus;
  // Other fields
  priority: Priority;
  analysis_review_required: boolean;
  code_review_required: boolean;
  technical_specs?: Record<string, unknown>;
  created_by?: number;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  // Resolved names for display
  capability_name?: string;
  // Legacy field for backward compatibility
  status?: EnablerStatus;
}

export interface EnablerWithDetails extends Enabler {
  capability?: {
    id: number;
    name: string;
    capability_id: string;
  };
  requirements?: EnablerRequirement[];
  acceptance_criteria?: AcceptanceCriteria[];
  dependencies?: EnablerDependency[];
}

export interface EnablerDependency {
  id: number;
  enabler_id: number;
  depends_on_enabler_id: number;
  dependency_type: 'blocks' | 'requires' | 'extends';
  notes?: string;
  created_at: string;
}

export interface CreateEnablerRequest {
  enabler_id: string;
  capability_id: number;
  name: string;
  purpose?: string;
  owner?: string;
  priority?: Priority;
  analysis_review_required?: boolean;
  code_review_required?: boolean;
  technical_specs?: Record<string, unknown>;
  // INTENT State Model - 4 dimensions
  lifecycle_state?: LifecycleState;
  workflow_stage?: WorkflowStage;
  stage_status?: StageStatus;
  approval_status?: ApprovalStatus;
}

export interface UpdateEnablerRequest {
  name?: string;
  purpose?: string;
  owner?: string;
  // INTENT State Model - 4 dimensions
  lifecycle_state?: LifecycleState;
  workflow_stage?: WorkflowStage;
  stage_status?: StageStatus;
  approval_status?: ApprovalStatus;
  // Other fields
  priority?: Priority;
  analysis_review_required?: boolean;
  code_review_required?: boolean;
  technical_specs?: Record<string, unknown>;
  is_active?: boolean;
}

// ========================
// Requirement Types
// ========================

export type RequirementType = 'functional' | 'non_functional';

export type NFRCategory =
  | 'performance'
  | 'security'
  | 'usability'
  | 'scalability'
  | 'reliability'
  | 'maintainability'
  | 'compatibility';

export type RequirementPriority =
  | 'must_have'
  | 'should_have'
  | 'could_have'
  | 'wont_have';

// Requirements use a simplified state model (they exist within an Enabler's workflow)
// They track stage_status and approval_status, inheriting workflow_stage from parent Enabler
export type RequirementStatus = StageStatus | 'implemented' | 'verified';
export type RequirementApprovalStatus = ApprovalStatus;

export interface EnablerRequirement {
  id: number;
  requirement_id: string;
  enabler_id: number;
  name: string;
  description: string;
  requirement_type: RequirementType;
  nfr_category?: NFRCategory;
  status: RequirementStatus;
  approval_status: string;
  priority: RequirementPriority;
  completed: boolean;
  verified_by?: number;
  verified_at?: string;
  notes?: string;
  created_by?: number;
  created_at: string;
  updated_at: string;
  // Resolved names
  verifier_name?: string;
}

export interface CreateRequirementRequest {
  requirement_id: string;
  enabler_id: number;
  name: string;
  description: string;
  requirement_type: RequirementType;
  nfr_category?: NFRCategory;
  priority: RequirementPriority;
  notes?: string;
}

export interface UpdateRequirementRequest {
  name?: string;
  description?: string;
  requirement_type?: RequirementType;
  nfr_category?: NFRCategory;
  status?: RequirementStatus;
  approval_status?: string;
  priority?: RequirementPriority;
  completed?: boolean;
  notes?: string;
}

export interface VerifyRequirementRequest {
  completed: boolean;
  notes?: string;
}

// ========================
// Acceptance Criteria Types
// ========================

export type EntityType = 'capability' | 'enabler' | 'requirement';

export type CriteriaFormat = 'checklist' | 'given_when_then' | 'metric';

export type CriteriaPriority = 'must' | 'should' | 'could' | 'wont';

export type CriteriaStatus = 'pending' | 'passed' | 'failed' | 'blocked' | 'skipped';

export interface AcceptanceCriteria {
  id: number;
  criteria_id: string;
  entity_type: EntityType;
  entity_id: number;
  title: string;
  description: string;
  criteria_format: CriteriaFormat;
  given_clause?: string;
  when_clause?: string;
  then_clause?: string;
  metric_name?: string;
  metric_target?: string;
  metric_actual?: string;
  priority: CriteriaPriority;
  status: CriteriaStatus;
  verified_by?: number;
  verified_at?: string;
  verification_notes?: string;
  created_by?: number;
  created_at: string;
  updated_at: string;
  // Resolved names
  verifier_name?: string;
  entity_name?: string;
}

export interface CreateAcceptanceCriteriaRequest {
  criteria_id: string;
  entity_type: EntityType;
  entity_id: number;
  title: string;
  description: string;
  criteria_format: CriteriaFormat;
  given_clause?: string;
  when_clause?: string;
  then_clause?: string;
  metric_name?: string;
  metric_target?: string;
  priority: CriteriaPriority;
}

export interface UpdateAcceptanceCriteriaRequest {
  title?: string;
  description?: string;
  criteria_format?: CriteriaFormat;
  given_clause?: string;
  when_clause?: string;
  then_clause?: string;
  metric_name?: string;
  metric_target?: string;
  metric_actual?: string;
  priority?: CriteriaPriority;
  status?: CriteriaStatus;
  verification_notes?: string;
}

export interface VerifyAcceptanceCriteriaRequest {
  status: 'passed' | 'failed' | 'blocked' | 'skipped';
  metric_actual?: string;
  verification_notes?: string;
}

export interface AcceptanceCriteriaSummary {
  entity_type: EntityType;
  entity_id: number;
  total_count: number;
  passed_count: number;
  failed_count: number;
  pending_count: number;
  blocked_count: number;
  skipped_count: number;
  percentage: number;
}

// ========================
// Enabler API Functions
// ========================

/**
 * Get all enablers with optional filters
 */
export async function getEnablers(params?: {
  capability_id?: number;
  status?: EnablerStatus;
  active_only?: boolean;
}): Promise<{ enablers: Enabler[] }> {
  const queryParams = new URLSearchParams();
  if (params?.capability_id) queryParams.append('capability_id', params.capability_id.toString());
  if (params?.status) queryParams.append('status', params.status);
  if (params?.active_only !== undefined) queryParams.append('active_only', params.active_only.toString());

  const query = queryParams.toString();
  return apiRequest(capabilityClient, {
    method: 'GET',
    url: `/enablers${query ? `?${query}` : ''}`,
  });
}

/**
 * Get a single enabler by ID
 */
export async function getEnabler(id: number): Promise<EnablerWithDetails> {
  return apiRequest(capabilityClient, {
    method: 'GET',
    url: `/enablers/${id}`,
  });
}

/**
 * Get enablers for a specific capability
 */
export async function getEnablersByCapability(capabilityId: number): Promise<{ enablers: Enabler[] }> {
  return apiRequest(capabilityClient, {
    method: 'GET',
    url: `/capabilities/${capabilityId}/enablers`,
  });
}

/**
 * Create a new enabler
 */
export async function createEnabler(data: CreateEnablerRequest): Promise<Enabler> {
  return apiRequest(capabilityClient, {
    method: 'POST',
    url: '/enablers',
    data,
  });
}

/**
 * Update an enabler
 */
export async function updateEnabler(id: number, data: UpdateEnablerRequest): Promise<Enabler> {
  return apiRequest(capabilityClient, {
    method: 'PUT',
    url: `/enablers/${id}`,
    data,
  });
}

/**
 * Delete an enabler
 */
export async function deleteEnabler(id: number): Promise<{ message: string }> {
  return apiRequest(capabilityClient, {
    method: 'DELETE',
    url: `/enablers/${id}`,
  });
}

// ========================
// Requirement API Functions
// ========================

/**
 * Get requirements for an enabler
 */
export async function getRequirementsByEnabler(enablerId: number): Promise<{ requirements: EnablerRequirement[] }> {
  return apiRequest(capabilityClient, {
    method: 'GET',
    url: `/enablers/${enablerId}/requirements`,
  });
}

/**
 * Get a single requirement by ID
 */
export async function getRequirement(id: number): Promise<EnablerRequirement> {
  return apiRequest(capabilityClient, {
    method: 'GET',
    url: `/requirements/${id}`,
  });
}

/**
 * Create a new requirement
 */
export async function createRequirement(data: CreateRequirementRequest): Promise<EnablerRequirement> {
  return apiRequest(capabilityClient, {
    method: 'POST',
    url: `/enablers/${data.enabler_id}/requirements`,
    data,
  });
}

/**
 * Update a requirement
 */
export async function updateRequirement(id: number, data: UpdateRequirementRequest): Promise<EnablerRequirement> {
  return apiRequest(capabilityClient, {
    method: 'PUT',
    url: `/requirements/${id}`,
    data,
  });
}

/**
 * Delete a requirement
 */
export async function deleteRequirement(id: number): Promise<{ message: string }> {
  return apiRequest(capabilityClient, {
    method: 'DELETE',
    url: `/requirements/${id}`,
  });
}

/**
 * Verify a requirement
 */
export async function verifyRequirement(id: number, data: VerifyRequirementRequest): Promise<EnablerRequirement> {
  return apiRequest(capabilityClient, {
    method: 'POST',
    url: `/requirements/${id}/verify`,
    data,
  });
}

// ========================
// Acceptance Criteria API Functions
// ========================

/**
 * Get all acceptance criteria with optional filters
 */
export async function getAllAcceptanceCriteria(params?: {
  entity_type?: EntityType;
  status?: CriteriaStatus;
}): Promise<{ criteria: AcceptanceCriteria[] }> {
  const queryParams = new URLSearchParams();
  if (params?.entity_type) queryParams.append('entity_type', params.entity_type);
  if (params?.status) queryParams.append('status', params.status);

  const query = queryParams.toString();
  return apiRequest(capabilityClient, {
    method: 'GET',
    url: `/criteria${query ? `?${query}` : ''}`,
  });
}

/**
 * Get a single acceptance criteria by ID
 */
export async function getAcceptanceCriteria(id: number): Promise<AcceptanceCriteria> {
  return apiRequest(capabilityClient, {
    method: 'GET',
    url: `/criteria/${id}`,
  });
}

/**
 * Get acceptance criteria for a capability
 */
export async function getCapabilityCriteria(capabilityId: number): Promise<{ criteria: AcceptanceCriteria[] }> {
  return apiRequest(capabilityClient, {
    method: 'GET',
    url: `/capabilities/${capabilityId}/criteria`,
  });
}

/**
 * Get acceptance criteria for an enabler
 */
export async function getEnablerCriteria(enablerId: number): Promise<{ criteria: AcceptanceCriteria[] }> {
  return apiRequest(capabilityClient, {
    method: 'GET',
    url: `/enablers/${enablerId}/criteria`,
  });
}

/**
 * Get acceptance criteria for a requirement
 */
export async function getRequirementCriteria(requirementId: number): Promise<{ criteria: AcceptanceCriteria[] }> {
  return apiRequest(capabilityClient, {
    method: 'GET',
    url: `/requirements/${requirementId}/criteria`,
  });
}

/**
 * Get acceptance criteria summary for an entity
 */
export async function getAcceptanceCriteriaSummary(
  entityType: EntityType,
  entityId: number
): Promise<AcceptanceCriteriaSummary> {
  return apiRequest(capabilityClient, {
    method: 'GET',
    url: `/${entityType === 'capability' ? 'capabilities' : entityType === 'enabler' ? 'enablers' : 'requirements'}/${entityId}/criteria/summary`,
  });
}

/**
 * Create acceptance criteria for a capability
 */
export async function createCapabilityCriteria(
  capabilityId: number,
  data: Omit<CreateAcceptanceCriteriaRequest, 'entity_type' | 'entity_id'>
): Promise<AcceptanceCriteria> {
  return apiRequest(capabilityClient, {
    method: 'POST',
    url: `/capabilities/${capabilityId}/criteria`,
    data: {
      ...data,
      entity_type: 'capability',
      entity_id: capabilityId,
    },
  });
}

/**
 * Create acceptance criteria for an enabler
 */
export async function createEnablerCriteria(
  enablerId: number,
  data: Omit<CreateAcceptanceCriteriaRequest, 'entity_type' | 'entity_id'>
): Promise<AcceptanceCriteria> {
  return apiRequest(capabilityClient, {
    method: 'POST',
    url: `/enablers/${enablerId}/criteria`,
    data: {
      ...data,
      entity_type: 'enabler',
      entity_id: enablerId,
    },
  });
}

/**
 * Create acceptance criteria for a requirement
 */
export async function createRequirementCriteria(
  requirementId: number,
  data: Omit<CreateAcceptanceCriteriaRequest, 'entity_type' | 'entity_id'>
): Promise<AcceptanceCriteria> {
  return apiRequest(capabilityClient, {
    method: 'POST',
    url: `/requirements/${requirementId}/criteria`,
    data: {
      ...data,
      entity_type: 'requirement',
      entity_id: requirementId,
    },
  });
}

/**
 * Update acceptance criteria
 */
export async function updateAcceptanceCriteria(
  id: number,
  data: UpdateAcceptanceCriteriaRequest
): Promise<AcceptanceCriteria> {
  return apiRequest(capabilityClient, {
    method: 'PUT',
    url: `/criteria/${id}`,
    data,
  });
}

/**
 * Delete acceptance criteria
 */
export async function deleteAcceptanceCriteria(id: number): Promise<{ message: string }> {
  return apiRequest(capabilityClient, {
    method: 'DELETE',
    url: `/criteria/${id}`,
  });
}

/**
 * Verify acceptance criteria (mark as passed/failed)
 */
export async function verifyAcceptanceCriteria(
  id: number,
  data: VerifyAcceptanceCriteriaRequest
): Promise<AcceptanceCriteria> {
  return apiRequest(capabilityClient, {
    method: 'POST',
    url: `/criteria/${id}/verify`,
    data,
  });
}

// ========================
// Helper Functions
// ========================

/**
 * Get display name for enabler status
 */
export function getEnablerStatusDisplayName(status: EnablerStatus): string {
  const names: Record<EnablerStatus, string> = {
    draft: 'Draft',
    ready_for_analysis: 'Ready for Analysis',
    in_analysis: 'In Analysis',
    ready_for_design: 'Ready for Design',
    in_design: 'In Design',
    ready_for_implementation: 'Ready for Implementation',
    in_implementation: 'In Implementation',
    implemented: 'Implemented',
    ready_for_refactor: 'Ready for Refactor',
    ready_for_retirement: 'Ready for Retirement',
  };
  return names[status] || status;
}

/**
 * Get color for enabler status
 */
export function getEnablerStatusColor(status: EnablerStatus): string {
  const colors: Record<EnablerStatus, string> = {
    draft: '#6b7280',
    ready_for_analysis: '#f59e0b',
    in_analysis: '#3b82f6',
    ready_for_design: '#f59e0b',
    in_design: '#3b82f6',
    ready_for_implementation: '#f59e0b',
    in_implementation: '#3b82f6',
    implemented: '#10b981',
    ready_for_refactor: '#8b5cf6',
    ready_for_retirement: '#ef4444',
  };
  return colors[status] || '#6b7280';
}

/**
 * Get display name for requirement type
 */
export function getRequirementTypeDisplayName(type: RequirementType): string {
  const names: Record<RequirementType, string> = {
    functional: 'Functional',
    non_functional: 'Non-Functional',
  };
  return names[type] || type;
}

/**
 * Get display name for NFR category
 */
export function getNFRCategoryDisplayName(category: NFRCategory): string {
  const names: Record<NFRCategory, string> = {
    performance: 'Performance',
    security: 'Security',
    usability: 'Usability',
    scalability: 'Scalability',
    reliability: 'Reliability',
    maintainability: 'Maintainability',
    compatibility: 'Compatibility',
  };
  return names[category] || category;
}

/**
 * Get display name for requirement priority (MoSCoW)
 */
export function getRequirementPriorityDisplayName(priority: RequirementPriority): string {
  const names: Record<RequirementPriority, string> = {
    must_have: 'Must Have',
    should_have: 'Should Have',
    could_have: 'Could Have',
    wont_have: "Won't Have",
  };
  return names[priority] || priority;
}

/**
 * Get color for requirement priority
 */
export function getRequirementPriorityColor(priority: RequirementPriority): string {
  const colors: Record<RequirementPriority, string> = {
    must_have: '#ef4444',
    should_have: '#f59e0b',
    could_have: '#3b82f6',
    wont_have: '#6b7280',
  };
  return colors[priority] || '#6b7280';
}

/**
 * Get display name for criteria format
 */
export function getCriteriaFormatDisplayName(format: CriteriaFormat): string {
  const names: Record<CriteriaFormat, string> = {
    checklist: 'Checklist',
    given_when_then: 'Given/When/Then',
    metric: 'Metric',
  };
  return names[format] || format;
}

/**
 * Get display name for criteria status
 */
export function getCriteriaStatusDisplayName(status: CriteriaStatus): string {
  const names: Record<CriteriaStatus, string> = {
    pending: 'Pending',
    passed: 'Passed',
    failed: 'Failed',
    blocked: 'Blocked',
    skipped: 'Skipped',
  };
  return names[status] || status;
}

/**
 * Get color for criteria status
 */
export function getCriteriaStatusColor(status: CriteriaStatus): string {
  const colors: Record<CriteriaStatus, string> = {
    pending: '#6b7280',
    passed: '#10b981',
    failed: '#ef4444',
    blocked: '#f59e0b',
    skipped: '#8b5cf6',
  };
  return colors[status] || '#6b7280';
}

/**
 * Get display name for criteria priority
 */
export function getCriteriaPriorityDisplayName(priority: CriteriaPriority): string {
  const names: Record<CriteriaPriority, string> = {
    must: 'Must',
    should: 'Should',
    could: 'Could',
    wont: "Won't",
  };
  return names[priority] || priority;
}

/**
 * Generate a unique ID with prefix
 */
export function generateId(prefix: 'ENB' | 'FR' | 'NFR' | 'AC'): string {
  const timestamp = Date.now().toString().slice(-4);
  const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
  return `${prefix}-${timestamp}${random}`;
}

/**
 * Calculate acceptance criteria completion percentage
 */
export function calculateCompletionPercentage(summary: AcceptanceCriteriaSummary): number {
  if (summary.total_count === 0) return 0;
  return Math.round((summary.passed_count / summary.total_count) * 100);
}

/**
 * Get overall health status based on criteria summary
 */
export function getHealthStatus(summary: AcceptanceCriteriaSummary): 'good' | 'warning' | 'critical' | 'unknown' {
  if (summary.total_count === 0) return 'unknown';
  if (summary.failed_count > 0) return 'critical';
  if (summary.blocked_count > 0) return 'warning';
  if (summary.pending_count > summary.passed_count) return 'warning';
  if (summary.passed_count === summary.total_count) return 'good';
  return 'warning';
}

// ========================
// Specification File Types
// ========================

export interface SpecificationRequirement {
  id: string;
  name: string;
  requirement: string;
  status?: string;
  priority?: string;
  type?: string;
}

export interface EnablerSpecification {
  fileName: string;
  filePath: string;
  content: string;
  name: string;
  type: string;
  id: string;
  capabilityId: string;
  owner: string;
  status: string;
  approval: string;
  priority: string;
  analysisReview: string;
  codeReview: string;
  purpose: string;
  functionalRequirements: SpecificationRequirement[];
  nonFunctionalRequirements: SpecificationRequirement[];
}

export interface EnablerSpecificationsResponse {
  success: boolean;
  enablers: EnablerSpecification[];
  count: number;
  path: string;
  message?: string;
}

// ========================
// Specification API Functions
// ========================

const SPECIFICATION_API_URL = SPEC_URL;

/**
 * Read enabler specifications from the specifications folder
 */
export async function readEnablerSpecifications(workspacePath?: string): Promise<EnablerSpecificationsResponse> {
  const response = await fetch(`${SPECIFICATION_API_URL}/api/read-enabler-specifications`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ workspacePath }),
  });

  if (!response.ok) {
    throw new Error(`Failed to read enabler specifications: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get status color for specification status
 */
export function getSpecificationStatusColor(status: string): string {
  const normalizedStatus = status.toLowerCase();
  if (normalizedStatus === 'implemented') return '#10b981';
  if (normalizedStatus === 'approved') return '#10b981';
  if (normalizedStatus === 'in progress' || normalizedStatus === 'in_progress') return '#3b82f6';
  if (normalizedStatus === 'draft') return '#6b7280';
  if (normalizedStatus === 'pending') return '#f59e0b';
  if (normalizedStatus === 'rejected') return '#ef4444';
  return '#6b7280';
}

/**
 * Get approval color for specification
 */
export function getSpecificationApprovalColor(approval: string): string {
  const normalizedApproval = approval.toLowerCase();
  if (normalizedApproval === 'approved') return '#10b981';
  if (normalizedApproval === 'pending') return '#f59e0b';
  if (normalizedApproval === 'rejected') return '#ef4444';
  if (normalizedApproval === 'not approved') return '#ef4444';
  return '#6b7280';
}
