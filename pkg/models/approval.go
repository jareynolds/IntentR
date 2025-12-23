// IntentR — Copyright © 2025 James Reynolds
//
// This file is part of IntentR.
// You may use this file under either:
//   • The AGPLv3 Open Source License, OR
//   • The IntentR Commercial License
// See the LICENSE.AGPL and LICENSE.COMMERCIAL files for details.

package models

import (
	"encoding/json"
	"time"
)

// ApprovalStatus represents the status of an approval request
type ApprovalStatus string

const (
	ApprovalStatusPending   ApprovalStatus = "pending_approval"
	ApprovalStatusApproved  ApprovalStatus = "approved"
	ApprovalStatusRejected  ApprovalStatus = "rejected"
	ApprovalStatusWithdrawn ApprovalStatus = "withdrawn"
)

// WorkflowStage represents the development stages
type WorkflowStage string

const (
	StageSpecification WorkflowStage = "specification"
	StageDefinition    WorkflowStage = "definition"
	StageDesign        WorkflowStage = "design"
	StageExecution     WorkflowStage = "execution"
)

// ValidStages returns all valid workflow stages
func ValidStages() []WorkflowStage {
	return []WorkflowStage{
		StageSpecification,
		StageDefinition,
		StageDesign,
		StageExecution,
	}
}

// IsValidStage checks if a stage string is valid
func IsValidStage(stage string) bool {
	for _, s := range ValidStages() {
		if string(s) == stage {
			return true
		}
	}
	return false
}

// CapabilityApproval represents an approval request for a capability
type CapabilityApproval struct {
	ID           int            `json:"id"`
	CapabilityID int            `json:"capability_id"`
	Stage        WorkflowStage  `json:"stage"`
	Status       ApprovalStatus `json:"status"`

	// Request details
	RequestedBy   int       `json:"requested_by"`
	RequestedAt   time.Time `json:"requested_at"`
	RequesterName string    `json:"requester_name,omitempty"` // Joined from users table

	// Decision details
	DecidedBy    *int       `json:"decided_by,omitempty"`
	DecidedAt    *time.Time `json:"decided_at,omitempty"`
	DeciderName  string     `json:"decider_name,omitempty"` // Joined from users table
	Feedback     *string    `json:"feedback,omitempty"`

	// Timestamps
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// ApprovalWorkflowRule defines who can request/approve for each stage
type ApprovalWorkflowRule struct {
	ID                 int       `json:"id"`
	Role               string    `json:"role"`
	Stage              string    `json:"stage"` // 'specification', 'definition', 'design', 'execution', or 'all'
	CanRequestApproval bool      `json:"can_request_approval"`
	CanApprove         bool      `json:"can_approve"`
	CanReject          bool      `json:"can_reject"`
	CreatedAt          time.Time `json:"created_at"`
	UpdatedAt          time.Time `json:"updated_at"`
}

// ApprovalAuditLog records all approval-related actions
type ApprovalAuditLog struct {
	ID           int             `json:"id"`
	ApprovalID   *int            `json:"approval_id,omitempty"`
	CapabilityID int             `json:"capability_id"`
	Action       string          `json:"action"` // 'requested', 'approved', 'rejected', 'withdrawn'
	Stage        string          `json:"stage"`
	PerformedBy  int             `json:"performed_by"`
	PerformerName string         `json:"performer_name,omitempty"` // Joined from users table
	PerformedAt  time.Time       `json:"performed_at"`
	Details      json.RawMessage `json:"details,omitempty"`
}

// UserPermissions represents what a user can do for approvals
type UserPermissions struct {
	UserID             int               `json:"user_id"`
	Role               string            `json:"role"`
	CanRequestApproval map[string]bool   `json:"can_request_approval"` // stage -> bool
	CanApprove         map[string]bool   `json:"can_approve"`          // stage -> bool
	CanReject          map[string]bool   `json:"can_reject"`           // stage -> bool
}

// RequestApprovalRequest is the request body for requesting approval
type RequestApprovalRequest struct {
	CapabilityID int    `json:"capability_id"`
	Stage        string `json:"stage"`
}

// ApprovalDecisionRequest is the request body for approving/rejecting
type ApprovalDecisionRequest struct {
	Feedback string `json:"feedback,omitempty"`
}

// ApprovalResponse wraps approval data with additional context
type ApprovalResponse struct {
	Approval       *CapabilityApproval `json:"approval"`
	CapabilityName string              `json:"capability_name"`
	CanApprove     bool                `json:"can_approve"`
	CanReject      bool                `json:"can_reject"`
	CanWithdraw    bool                `json:"can_withdraw"`
}

// PendingApprovalsResponse lists pending approvals with counts
type PendingApprovalsResponse struct {
	Approvals  []ApprovalResponse `json:"approvals"`
	TotalCount int                `json:"total_count"`
	ByStage    map[string]int     `json:"by_stage"` // stage -> count
}

// ApprovalHistoryResponse wraps approval history for a capability
type ApprovalHistoryResponse struct {
	CapabilityID   int                `json:"capability_id"`
	CapabilityName string             `json:"capability_name"`
	CurrentStage   string             `json:"current_stage"`
	CurrentStatus  string             `json:"current_status"`
	Approvals      []CapabilityApproval `json:"approvals"`
	AuditLog       []ApprovalAuditLog   `json:"audit_log"`
}

// StageTransition represents a valid stage transition
type StageTransition struct {
	FromStage WorkflowStage
	ToStage   WorkflowStage
}

// ValidTransitions returns all valid stage transitions
func ValidTransitions() []StageTransition {
	return []StageTransition{
		{StageSpecification, StageDefinition},
		{StageDefinition, StageDesign},
		{StageDesign, StageExecution},
	}
}

// CanTransition checks if a transition from one stage to another is valid
func CanTransition(from, to WorkflowStage) bool {
	for _, t := range ValidTransitions() {
		if t.FromStage == from && t.ToStage == to {
			return true
		}
	}
	return false
}

// NextStage returns the next stage after the given stage
func NextStage(current WorkflowStage) (WorkflowStage, bool) {
	switch current {
	case StageSpecification:
		return StageDefinition, true
	case StageDefinition:
		return StageDesign, true
	case StageDesign:
		return StageExecution, true
	case StageExecution:
		return "", false // No next stage after execution
	default:
		return "", false
	}
}
