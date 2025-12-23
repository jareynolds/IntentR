// IntentR - Copyright 2025 James Reynolds
//
// This file is part of IntentR.
// You may use this file under either:
//   - The AGPLv3 Open Source License, OR
//   - The IntentR Commercial License
// See the LICENSE.AGPL and LICENSE.COMMERCIAL files for details.

package models

import (
	"encoding/json"
	"time"
)

// Enabler represents a technical implementation that realizes a capability
type Enabler struct {
	ID                     int             `json:"id"`
	EnablerID              string          `json:"enabler_id"`
	CapabilityID           int             `json:"capability_id"`
	Name                   string          `json:"name"`
	Purpose                *string         `json:"purpose,omitempty"`
	Owner                  *string         `json:"owner,omitempty"`
	Status                 string          `json:"status"`
	ApprovalStatus         string          `json:"approval_status"`
	WorkflowStage          string          `json:"workflow_stage"`
	Priority               string          `json:"priority"`
	AnalysisReviewRequired bool            `json:"analysis_review_required"`
	CodeReviewRequired     bool            `json:"code_review_required"`
	TechnicalSpecs         json.RawMessage `json:"technical_specs,omitempty"`
	CreatedBy              *int            `json:"created_by,omitempty"`
	CreatedAt              time.Time       `json:"created_at"`
	UpdatedAt              time.Time       `json:"updated_at"`
	IsActive               bool            `json:"is_active"`
}

// EnablerWithDetails includes the enabler with all related data
type EnablerWithDetails struct {
	Enabler
	CapabilityName string                `json:"capability_name,omitempty"`
	Requirements   []EnablerRequirement  `json:"requirements,omitempty"`
	Dependencies   []EnablerDependency   `json:"dependencies,omitempty"`
	Criteria       []AcceptanceCriteria  `json:"acceptance_criteria,omitempty"`
}

// EnablerDependency represents a dependency relationship for an enabler
type EnablerDependency struct {
	ID                   int       `json:"id"`
	EnablerID            int       `json:"enabler_id"`
	DependsOnEnablerID   *int      `json:"depends_on_enabler_id,omitempty"`
	DependsOnCapabilityID *int     `json:"depends_on_capability_id,omitempty"`
	DependencyType       string    `json:"dependency_type"` // 'upstream' or 'downstream'
	Description          *string   `json:"description,omitempty"`
	CreatedAt            time.Time `json:"created_at"`
	// Resolved names for display
	DependsOnEnablerName    string `json:"depends_on_enabler_name,omitempty"`
	DependsOnCapabilityName string `json:"depends_on_capability_name,omitempty"`
}

// EnablerApproval represents an approval request for an enabler
type EnablerApproval struct {
	ID            int        `json:"id"`
	EnablerID     int        `json:"enabler_id"`
	Stage         string     `json:"stage"`
	Status        string     `json:"status"`
	RequestedBy   int        `json:"requested_by"`
	RequestedAt   time.Time  `json:"requested_at"`
	DecidedBy     *int       `json:"decided_by,omitempty"`
	DecidedAt     *time.Time `json:"decided_at,omitempty"`
	Feedback      *string    `json:"feedback,omitempty"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
	// Resolved names for display
	RequesterName string `json:"requester_name,omitempty"`
	DeciderName   string `json:"decider_name,omitempty"`
}

// CreateEnablerRequest represents the request to create a new enabler
type CreateEnablerRequest struct {
	EnablerID              string          `json:"enabler_id"`
	CapabilityID           int             `json:"capability_id"`
	Name                   string          `json:"name"`
	Purpose                string          `json:"purpose"`
	Owner                  string          `json:"owner"`
	Priority               string          `json:"priority"`
	AnalysisReviewRequired bool            `json:"analysis_review_required"`
	CodeReviewRequired     bool            `json:"code_review_required"`
	TechnicalSpecs         json.RawMessage `json:"technical_specs,omitempty"`
}

// UpdateEnablerRequest represents the request to update an enabler
type UpdateEnablerRequest struct {
	Name                   *string          `json:"name,omitempty"`
	Purpose                *string          `json:"purpose,omitempty"`
	Owner                  *string          `json:"owner,omitempty"`
	Status                 *string          `json:"status,omitempty"`
	ApprovalStatus         *string          `json:"approval_status,omitempty"`
	WorkflowStage          *string          `json:"workflow_stage,omitempty"`
	Priority               *string          `json:"priority,omitempty"`
	AnalysisReviewRequired *bool            `json:"analysis_review_required,omitempty"`
	CodeReviewRequired     *bool            `json:"code_review_required,omitempty"`
	TechnicalSpecs         json.RawMessage  `json:"technical_specs,omitempty"`
	IsActive               *bool            `json:"is_active,omitempty"`
}

// Enabler status constants
const (
	EnablerStatusDraft                  = "draft"
	EnablerStatusReadyForAnalysis       = "ready_for_analysis"
	EnablerStatusInAnalysis             = "in_analysis"
	EnablerStatusReadyForDesign         = "ready_for_design"
	EnablerStatusInDesign               = "in_design"
	EnablerStatusReadyForImplementation = "ready_for_implementation"
	EnablerStatusInImplementation       = "in_implementation"
	EnablerStatusImplemented            = "implemented"
	EnablerStatusDeprecated             = "deprecated"
)

// ValidEnablerStatuses returns all valid enabler statuses
func ValidEnablerStatuses() []string {
	return []string{
		EnablerStatusDraft,
		EnablerStatusReadyForAnalysis,
		EnablerStatusInAnalysis,
		EnablerStatusReadyForDesign,
		EnablerStatusInDesign,
		EnablerStatusReadyForImplementation,
		EnablerStatusInImplementation,
		EnablerStatusImplemented,
		EnablerStatusDeprecated,
	}
}
