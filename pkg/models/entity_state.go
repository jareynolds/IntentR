// IntentR — Copyright © 2025 James Reynolds
//
// This file is part of IntentR.
// You may use this file under either:
//   • The AGPLv3 Open Source License, OR
//   • The IntentR Commercial License
// See the LICENSE.AGPL and LICENSE.COMMERCIAL files for details.

package models

import "time"

// EntityType represents the type of entity for polymorphic state management
// Note: This is a typed version; acceptance_criteria.go has untyped string constants
type EntityType string

const (
	EntityTypeCapabilityState EntityType = "capability"
	EntityTypeEnablerState    EntityType = "enabler"
	EntityTypeStoryCardState  EntityType = "story_card"
)

// LifecycleState represents the lifecycle state of an entity in the INTENT framework
type LifecycleState string

const (
	LifecycleStateDraft       LifecycleState = "draft"
	LifecycleStateActive      LifecycleState = "active"
	LifecycleStateImplemented LifecycleState = "implemented"
	LifecycleStateMaintained  LifecycleState = "maintained"
	LifecycleStateRetired     LifecycleState = "retired"
)

// INTENTWorkflowStage represents the workflow stage in the INTENT framework lifecycle
// Note: This differs from approval.go's WorkflowStage which is for capability approval workflow
type INTENTWorkflowStage string

const (
	INTENTStageIntent         INTENTWorkflowStage = "intent"
	INTENTStageSpecification  INTENTWorkflowStage = "specification"
	INTENTStageUIDesign       INTENTWorkflowStage = "ui_design"
	INTENTStageImplementation INTENTWorkflowStage = "implementation"
	INTENTStageControlLoop    INTENTWorkflowStage = "control_loop"
)

// StageStatus represents the status within a workflow stage
type StageStatus string

const (
	StageStatusInProgress       StageStatus = "in_progress"
	StageStatusReadyForApproval StageStatus = "ready_for_approval"
	StageStatusApproved         StageStatus = "approved"
	StageStatusBlocked          StageStatus = "blocked"
)

// INTENTApprovalStatus represents the approval status in the INTENT state model
// Note: This uses simpler values than approval.go's ApprovalStatus
type INTENTApprovalStatus string

const (
	INTENTApprovalPending  INTENTApprovalStatus = "pending"
	INTENTApprovalApproved INTENTApprovalStatus = "approved"
	INTENTApprovalRejected INTENTApprovalStatus = "rejected"
)

// StoryCard represents a storyboard card in the INTENT framework
type StoryCard struct {
	ID          int       `json:"id"`
	CardID      string    `json:"card_id"` // Client-generated UUID
	Title       string    `json:"title"`
	Description string    `json:"description"`
	CardType    string    `json:"card_type"` // persona, goal, constraint, etc.
	ImageURL    string    `json:"image_url,omitempty"`
	PositionX   float64   `json:"position_x"`
	PositionY   float64   `json:"position_y"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
	CreatedBy   *int      `json:"created_by,omitempty"`
	UpdatedBy   *int      `json:"updated_by,omitempty"`
	IsActive    bool      `json:"is_active"`

	// INTENT State Model - 4 dimensions
	LifecycleState string `json:"lifecycle_state"`
	WorkflowStage  string `json:"workflow_stage"`
	StageStatus    string `json:"stage_status"`
	ApprovalStatus string `json:"approval_status"`

	// Concurrency control
	Version int `json:"version"`

	// Workspace tracking
	WorkspaceID string `json:"workspace_id"`
	FilePath    string `json:"file_path,omitempty"`
}

// StoryCardConnection represents a connection between story cards
type StoryCardConnection struct {
	ID             int       `json:"id"`
	FromCardID     int       `json:"from_card_id"`
	ToCardID       int       `json:"to_card_id"`
	ConnectionType string    `json:"connection_type"` // flow, dependency, etc.
	CreatedAt      time.Time `json:"created_at"`
}

// CreateStoryCardRequest represents the request to create a new story card
type CreateStoryCardRequest struct {
	CardID         string  `json:"card_id"`
	Title          string  `json:"title"`
	Description    string  `json:"description"`
	CardType       string  `json:"card_type"`
	ImageURL       string  `json:"image_url,omitempty"`
	PositionX      float64 `json:"position_x"`
	PositionY      float64 `json:"position_y"`
	WorkspaceID    string  `json:"workspace_id"`
	FilePath       string  `json:"file_path,omitempty"`
	LifecycleState string  `json:"lifecycle_state,omitempty"`
	WorkflowStage  string  `json:"workflow_stage,omitempty"`
	StageStatus    string  `json:"stage_status,omitempty"`
	ApprovalStatus string  `json:"approval_status,omitempty"`
}

// UpdateStoryCardRequest represents the request to update a story card
type UpdateStoryCardRequest struct {
	Title          *string  `json:"title,omitempty"`
	Description    *string  `json:"description,omitempty"`
	CardType       *string  `json:"card_type,omitempty"`
	ImageURL       *string  `json:"image_url,omitempty"`
	PositionX      *float64 `json:"position_x,omitempty"`
	PositionY      *float64 `json:"position_y,omitempty"`
	IsActive       *bool    `json:"is_active,omitempty"`
	LifecycleState *string  `json:"lifecycle_state,omitempty"`
	WorkflowStage  *string  `json:"workflow_stage,omitempty"`
	StageStatus    *string  `json:"stage_status,omitempty"`
	ApprovalStatus *string  `json:"approval_status,omitempty"`
	Version        *int     `json:"version,omitempty"`
}

// EntityStateChange represents a change in entity state for audit logging
type EntityStateChange struct {
	ID           int       `json:"id"`
	EntityType   string    `json:"entity_type"`
	EntityID     string    `json:"entity_id"`
	FieldChanged string    `json:"field_changed"`
	OldValue     string    `json:"old_value"`
	NewValue     string    `json:"new_value"`
	ChangeReason string    `json:"change_reason,omitempty"`
	ChangedBy    *int      `json:"changed_by,omitempty"`
	ChangedAt    time.Time `json:"changed_at"`
	WorkspaceID  string    `json:"workspace_id,omitempty"`
}

// EntityState is a generic interface for entities with INTENT State Model
type EntityState interface {
	GetEntityType() EntityType
	GetEntityID() string
	GetLifecycleState() string
	GetWorkflowStage() string
	GetStageStatus() string
	GetApprovalStatus() string
	GetVersion() int
	GetWorkspaceID() string
}

// Implement EntityState for Capability
func (c *Capability) GetEntityType() EntityType { return EntityTypeCapabilityState }
func (c *Capability) GetEntityID() string       { return c.CapabilityID }
func (c *Capability) GetLifecycleState() string { return c.LifecycleState }
func (c *Capability) GetWorkflowStage() string  { return c.WorkflowStage }
func (c *Capability) GetStageStatus() string    { return c.StageStatus }
func (c *Capability) GetApprovalStatus() string { return c.ApprovalStatus }
func (c *Capability) GetVersion() int           { return c.Version }
func (c *Capability) GetWorkspaceID() string    { return c.WorkspaceID }

// Implement EntityState for StoryCard
func (s *StoryCard) GetEntityType() EntityType { return EntityTypeStoryCardState }
func (s *StoryCard) GetEntityID() string       { return s.CardID }
func (s *StoryCard) GetLifecycleState() string { return s.LifecycleState }
func (s *StoryCard) GetWorkflowStage() string  { return s.WorkflowStage }
func (s *StoryCard) GetStageStatus() string    { return s.StageStatus }
func (s *StoryCard) GetApprovalStatus() string { return s.ApprovalStatus }
func (s *StoryCard) GetVersion() int           { return s.Version }
func (s *StoryCard) GetWorkspaceID() string    { return s.WorkspaceID }

// BulkStateResponse represents the response for bulk state queries
type BulkStateResponse struct {
	Capabilities []Capability `json:"capabilities,omitempty"`
	Enablers     []Enabler    `json:"enablers,omitempty"`
	StoryCards   []StoryCard  `json:"story_cards,omitempty"`
}

// OptimisticLockError is returned when a concurrent update is detected
type OptimisticLockError struct {
	EntityType      string `json:"entity_type"`
	EntityID        string `json:"entity_id"`
	ExpectedVersion int    `json:"expected_version"`
	ActualVersion   int    `json:"actual_version"`
}

func (e *OptimisticLockError) Error() string {
	return "concurrent update detected: entity was modified by another user"
}
