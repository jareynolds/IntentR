// IntentR — Copyright © 2025 James Reynolds
//
// This file is part of IntentR.
// You may use this file under either:
//   • The AGPLv3 Open Source License, OR
//   • The IntentR Commercial License
// See the LICENSE.AGPL and LICENSE.COMMERCIAL files for details.

package repository

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/jareynolds/ubecode/pkg/models"
)

// ApprovalRepository handles database operations for approvals
type ApprovalRepository struct {
	db *sql.DB
}

// NewApprovalRepository creates a new approval repository
func NewApprovalRepository(db *sql.DB) *ApprovalRepository {
	return &ApprovalRepository{db: db}
}

// RequestApproval creates a new approval request for a capability
func (r *ApprovalRepository) RequestApproval(capabilityID int, stage string, userID int) (*models.CapabilityApproval, error) {
	tx, err := r.db.Begin()
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	// Check if there's already a pending approval for this capability and stage
	var existingID int
	err = tx.QueryRow(`
		SELECT id FROM capability_approvals
		WHERE capability_id = $1 AND stage = $2 AND status = 'pending_approval'
	`, capabilityID, stage).Scan(&existingID)
	if err == nil {
		return nil, fmt.Errorf("approval request already pending for this capability and stage")
	}
	if err != sql.ErrNoRows {
		return nil, fmt.Errorf("failed to check existing approvals: %w", err)
	}

	// Create the approval request
	var approval models.CapabilityApproval
	err = tx.QueryRow(`
		INSERT INTO capability_approvals (capability_id, stage, status, requested_by)
		VALUES ($1, $2, 'pending_approval', $3)
		RETURNING id, capability_id, stage, status, requested_by, requested_at, created_at, updated_at
	`, capabilityID, stage, userID).Scan(
		&approval.ID, &approval.CapabilityID, &approval.Stage, &approval.Status,
		&approval.RequestedBy, &approval.RequestedAt, &approval.CreatedAt, &approval.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create approval request: %w", err)
	}

	// Update capability approval status
	_, err = tx.Exec(`
		UPDATE capabilities
		SET approval_status = 'pending_approval', current_stage = $1, updated_at = CURRENT_TIMESTAMP
		WHERE id = $2
	`, stage, capabilityID)
	if err != nil {
		return nil, fmt.Errorf("failed to update capability status: %w", err)
	}

	// Log the action
	details := map[string]interface{}{
		"stage": stage,
	}
	detailsJSON, _ := json.Marshal(details)
	_, err = tx.Exec(`
		INSERT INTO approval_audit_log (approval_id, capability_id, action, stage, performed_by, details)
		VALUES ($1, $2, 'requested', $3, $4, $5)
	`, approval.ID, capabilityID, stage, userID, detailsJSON)
	if err != nil {
		return nil, fmt.Errorf("failed to create audit log: %w", err)
	}

	if err = tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	// Fetch requester name
	r.enrichApprovalWithNames(&approval)

	return &approval, nil
}

// Approve approves an approval request
func (r *ApprovalRepository) Approve(approvalID int, userID int, feedback string) (*models.CapabilityApproval, error) {
	tx, err := r.db.Begin()
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	// Get current approval
	var approval models.CapabilityApproval
	err = tx.QueryRow(`
		SELECT id, capability_id, stage, status, requested_by, requested_at
		FROM capability_approvals WHERE id = $1
	`, approvalID).Scan(
		&approval.ID, &approval.CapabilityID, &approval.Stage, &approval.Status,
		&approval.RequestedBy, &approval.RequestedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get approval: %w", err)
	}

	if approval.Status != models.ApprovalStatusPending {
		return nil, fmt.Errorf("approval is not in pending status")
	}

	// Update approval
	now := time.Now()
	var feedbackPtr *string
	if feedback != "" {
		feedbackPtr = &feedback
	}

	err = tx.QueryRow(`
		UPDATE capability_approvals
		SET status = 'approved', decided_by = $1, decided_at = $2, feedback = $3, updated_at = CURRENT_TIMESTAMP
		WHERE id = $4
		RETURNING id, capability_id, stage, status, requested_by, requested_at, decided_by, decided_at, feedback, created_at, updated_at
	`, userID, now, feedbackPtr, approvalID).Scan(
		&approval.ID, &approval.CapabilityID, &approval.Stage, &approval.Status,
		&approval.RequestedBy, &approval.RequestedAt, &approval.DecidedBy, &approval.DecidedAt,
		&approval.Feedback, &approval.CreatedAt, &approval.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to update approval: %w", err)
	}

	// Update capability
	_, err = tx.Exec(`
		UPDATE capabilities
		SET approval_status = 'approved', approved_by = $1, approved_at = $2, updated_at = CURRENT_TIMESTAMP
		WHERE id = $3
	`, userID, now, approval.CapabilityID)
	if err != nil {
		return nil, fmt.Errorf("failed to update capability status: %w", err)
	}

	// Log the action
	details := map[string]interface{}{
		"stage":    string(approval.Stage),
		"feedback": feedback,
	}
	detailsJSON, _ := json.Marshal(details)
	_, err = tx.Exec(`
		INSERT INTO approval_audit_log (approval_id, capability_id, action, stage, performed_by, details)
		VALUES ($1, $2, 'approved', $3, $4, $5)
	`, approval.ID, approval.CapabilityID, approval.Stage, userID, detailsJSON)
	if err != nil {
		return nil, fmt.Errorf("failed to create audit log: %w", err)
	}

	if err = tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	r.enrichApprovalWithNames(&approval)
	return &approval, nil
}

// Reject rejects an approval request
func (r *ApprovalRepository) Reject(approvalID int, userID int, feedback string) (*models.CapabilityApproval, error) {
	if feedback == "" {
		return nil, fmt.Errorf("feedback is required when rejecting")
	}

	tx, err := r.db.Begin()
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	// Get current approval
	var approval models.CapabilityApproval
	err = tx.QueryRow(`
		SELECT id, capability_id, stage, status, requested_by, requested_at
		FROM capability_approvals WHERE id = $1
	`, approvalID).Scan(
		&approval.ID, &approval.CapabilityID, &approval.Stage, &approval.Status,
		&approval.RequestedBy, &approval.RequestedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get approval: %w", err)
	}

	if approval.Status != models.ApprovalStatusPending {
		return nil, fmt.Errorf("approval is not in pending status")
	}

	// Update approval
	now := time.Now()
	err = tx.QueryRow(`
		UPDATE capability_approvals
		SET status = 'rejected', decided_by = $1, decided_at = $2, feedback = $3, updated_at = CURRENT_TIMESTAMP
		WHERE id = $4
		RETURNING id, capability_id, stage, status, requested_by, requested_at, decided_by, decided_at, feedback, created_at, updated_at
	`, userID, now, feedback, approvalID).Scan(
		&approval.ID, &approval.CapabilityID, &approval.Stage, &approval.Status,
		&approval.RequestedBy, &approval.RequestedAt, &approval.DecidedBy, &approval.DecidedAt,
		&approval.Feedback, &approval.CreatedAt, &approval.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to update approval: %w", err)
	}

	// Update capability status back to draft (can be edited again)
	_, err = tx.Exec(`
		UPDATE capabilities
		SET approval_status = 'rejected', updated_at = CURRENT_TIMESTAMP
		WHERE id = $1
	`, approval.CapabilityID)
	if err != nil {
		return nil, fmt.Errorf("failed to update capability status: %w", err)
	}

	// Log the action
	details := map[string]interface{}{
		"stage":    string(approval.Stage),
		"feedback": feedback,
	}
	detailsJSON, _ := json.Marshal(details)
	_, err = tx.Exec(`
		INSERT INTO approval_audit_log (approval_id, capability_id, action, stage, performed_by, details)
		VALUES ($1, $2, 'rejected', $3, $4, $5)
	`, approval.ID, approval.CapabilityID, approval.Stage, userID, detailsJSON)
	if err != nil {
		return nil, fmt.Errorf("failed to create audit log: %w", err)
	}

	if err = tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	r.enrichApprovalWithNames(&approval)
	return &approval, nil
}

// Withdraw withdraws an approval request (only by the requester)
func (r *ApprovalRepository) Withdraw(approvalID int, userID int) (*models.CapabilityApproval, error) {
	tx, err := r.db.Begin()
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	// Get current approval and verify ownership
	var approval models.CapabilityApproval
	err = tx.QueryRow(`
		SELECT id, capability_id, stage, status, requested_by, requested_at
		FROM capability_approvals WHERE id = $1
	`, approvalID).Scan(
		&approval.ID, &approval.CapabilityID, &approval.Stage, &approval.Status,
		&approval.RequestedBy, &approval.RequestedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get approval: %w", err)
	}

	if approval.Status != models.ApprovalStatusPending {
		return nil, fmt.Errorf("approval is not in pending status")
	}

	if approval.RequestedBy != userID {
		return nil, fmt.Errorf("only the requester can withdraw an approval request")
	}

	// Update approval
	now := time.Now()
	err = tx.QueryRow(`
		UPDATE capability_approvals
		SET status = 'withdrawn', decided_by = $1, decided_at = $2, updated_at = CURRENT_TIMESTAMP
		WHERE id = $3
		RETURNING id, capability_id, stage, status, requested_by, requested_at, decided_by, decided_at, feedback, created_at, updated_at
	`, userID, now, approvalID).Scan(
		&approval.ID, &approval.CapabilityID, &approval.Stage, &approval.Status,
		&approval.RequestedBy, &approval.RequestedAt, &approval.DecidedBy, &approval.DecidedAt,
		&approval.Feedback, &approval.CreatedAt, &approval.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to update approval: %w", err)
	}

	// Update capability status back to draft
	_, err = tx.Exec(`
		UPDATE capabilities
		SET approval_status = 'draft', updated_at = CURRENT_TIMESTAMP
		WHERE id = $1
	`, approval.CapabilityID)
	if err != nil {
		return nil, fmt.Errorf("failed to update capability status: %w", err)
	}

	// Log the action
	details := map[string]interface{}{
		"stage": string(approval.Stage),
	}
	detailsJSON, _ := json.Marshal(details)
	_, err = tx.Exec(`
		INSERT INTO approval_audit_log (approval_id, capability_id, action, stage, performed_by, details)
		VALUES ($1, $2, 'withdrawn', $3, $4, $5)
	`, approval.ID, approval.CapabilityID, approval.Stage, userID, detailsJSON)
	if err != nil {
		return nil, fmt.Errorf("failed to create audit log: %w", err)
	}

	if err = tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	r.enrichApprovalWithNames(&approval)
	return &approval, nil
}

// GetPendingApprovals returns all pending approval requests
func (r *ApprovalRepository) GetPendingApprovals() ([]models.CapabilityApproval, error) {
	rows, err := r.db.Query(`
		SELECT ca.id, ca.capability_id, ca.stage, ca.status, ca.requested_by, ca.requested_at,
		       ca.decided_by, ca.decided_at, ca.feedback, ca.created_at, ca.updated_at,
		       u.name as requester_name
		FROM capability_approvals ca
		LEFT JOIN users u ON ca.requested_by = u.id
		WHERE ca.status = 'pending_approval'
		ORDER BY ca.requested_at ASC
	`)
	if err != nil {
		return nil, fmt.Errorf("failed to query pending approvals: %w", err)
	}
	defer rows.Close()

	var approvals []models.CapabilityApproval
	for rows.Next() {
		var a models.CapabilityApproval
		err := rows.Scan(
			&a.ID, &a.CapabilityID, &a.Stage, &a.Status, &a.RequestedBy, &a.RequestedAt,
			&a.DecidedBy, &a.DecidedAt, &a.Feedback, &a.CreatedAt, &a.UpdatedAt,
			&a.RequesterName,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan approval: %w", err)
		}
		approvals = append(approvals, a)
	}

	return approvals, nil
}

// GetApprovalHistory returns all approvals for a capability
func (r *ApprovalRepository) GetApprovalHistory(capabilityID int) ([]models.CapabilityApproval, error) {
	rows, err := r.db.Query(`
		SELECT ca.id, ca.capability_id, ca.stage, ca.status, ca.requested_by, ca.requested_at,
		       ca.decided_by, ca.decided_at, ca.feedback, ca.created_at, ca.updated_at,
		       u1.name as requester_name, u2.name as decider_name
		FROM capability_approvals ca
		LEFT JOIN users u1 ON ca.requested_by = u1.id
		LEFT JOIN users u2 ON ca.decided_by = u2.id
		WHERE ca.capability_id = $1
		ORDER BY ca.created_at DESC
	`, capabilityID)
	if err != nil {
		return nil, fmt.Errorf("failed to query approval history: %w", err)
	}
	defer rows.Close()

	var approvals []models.CapabilityApproval
	for rows.Next() {
		var a models.CapabilityApproval
		var deciderName sql.NullString
		err := rows.Scan(
			&a.ID, &a.CapabilityID, &a.Stage, &a.Status, &a.RequestedBy, &a.RequestedAt,
			&a.DecidedBy, &a.DecidedAt, &a.Feedback, &a.CreatedAt, &a.UpdatedAt,
			&a.RequesterName, &deciderName,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan approval: %w", err)
		}
		if deciderName.Valid {
			a.DeciderName = deciderName.String
		}
		approvals = append(approvals, a)
	}

	return approvals, nil
}

// GetAuditLog returns the audit log for a capability
func (r *ApprovalRepository) GetAuditLog(capabilityID int) ([]models.ApprovalAuditLog, error) {
	rows, err := r.db.Query(`
		SELECT al.id, al.approval_id, al.capability_id, al.action, al.stage,
		       al.performed_by, al.performed_at, al.details, u.name as performer_name
		FROM approval_audit_log al
		LEFT JOIN users u ON al.performed_by = u.id
		WHERE al.capability_id = $1
		ORDER BY al.performed_at DESC
	`, capabilityID)
	if err != nil {
		return nil, fmt.Errorf("failed to query audit log: %w", err)
	}
	defer rows.Close()

	var logs []models.ApprovalAuditLog
	for rows.Next() {
		var l models.ApprovalAuditLog
		err := rows.Scan(
			&l.ID, &l.ApprovalID, &l.CapabilityID, &l.Action, &l.Stage,
			&l.PerformedBy, &l.PerformedAt, &l.Details, &l.PerformerName,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan audit log: %w", err)
		}
		logs = append(logs, l)
	}

	return logs, nil
}

// GetWorkflowRules returns all workflow rules
func (r *ApprovalRepository) GetWorkflowRules() ([]models.ApprovalWorkflowRule, error) {
	rows, err := r.db.Query(`
		SELECT id, role, stage, can_request_approval, can_approve, can_reject, created_at, updated_at
		FROM approval_workflow_rules
		ORDER BY role, stage
	`)
	if err != nil {
		return nil, fmt.Errorf("failed to query workflow rules: %w", err)
	}
	defer rows.Close()

	var rules []models.ApprovalWorkflowRule
	for rows.Next() {
		var rule models.ApprovalWorkflowRule
		err := rows.Scan(
			&rule.ID, &rule.Role, &rule.Stage, &rule.CanRequestApproval,
			&rule.CanApprove, &rule.CanReject, &rule.CreatedAt, &rule.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan workflow rule: %w", err)
		}
		rules = append(rules, rule)
	}

	return rules, nil
}

// GetUserPermissions returns what a user can do for approvals based on their role
func (r *ApprovalRepository) GetUserPermissions(role string) (*models.UserPermissions, error) {
	permissions := &models.UserPermissions{
		Role:               role,
		CanRequestApproval: make(map[string]bool),
		CanApprove:         make(map[string]bool),
		CanReject:          make(map[string]bool),
	}

	// Get rules for this role (including 'all' stage rules)
	rows, err := r.db.Query(`
		SELECT stage, can_request_approval, can_approve, can_reject
		FROM approval_workflow_rules
		WHERE role = $1
	`, role)
	if err != nil {
		return nil, fmt.Errorf("failed to query workflow rules: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var stage string
		var canRequest, canApprove, canReject bool
		err := rows.Scan(&stage, &canRequest, &canApprove, &canReject)
		if err != nil {
			return nil, fmt.Errorf("failed to scan workflow rule: %w", err)
		}

		if stage == "all" {
			// Apply to all stages
			for _, s := range models.ValidStages() {
				permissions.CanRequestApproval[string(s)] = canRequest
				permissions.CanApprove[string(s)] = canApprove
				permissions.CanReject[string(s)] = canReject
			}
		} else {
			permissions.CanRequestApproval[stage] = canRequest
			permissions.CanApprove[stage] = canApprove
			permissions.CanReject[stage] = canReject
		}
	}

	return permissions, nil
}

// GetApprovalByID returns an approval by its ID
func (r *ApprovalRepository) GetApprovalByID(id int) (*models.CapabilityApproval, error) {
	var approval models.CapabilityApproval
	err := r.db.QueryRow(`
		SELECT ca.id, ca.capability_id, ca.stage, ca.status, ca.requested_by, ca.requested_at,
		       ca.decided_by, ca.decided_at, ca.feedback, ca.created_at, ca.updated_at,
		       u1.name as requester_name, u2.name as decider_name
		FROM capability_approvals ca
		LEFT JOIN users u1 ON ca.requested_by = u1.id
		LEFT JOIN users u2 ON ca.decided_by = u2.id
		WHERE ca.id = $1
	`, id).Scan(
		&approval.ID, &approval.CapabilityID, &approval.Stage, &approval.Status,
		&approval.RequestedBy, &approval.RequestedAt, &approval.DecidedBy, &approval.DecidedAt,
		&approval.Feedback, &approval.CreatedAt, &approval.UpdatedAt,
		&approval.RequesterName, &approval.DeciderName,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get approval: %w", err)
	}

	return &approval, nil
}

// enrichApprovalWithNames adds user names to an approval
func (r *ApprovalRepository) enrichApprovalWithNames(approval *models.CapabilityApproval) {
	// Get requester name
	r.db.QueryRow("SELECT name FROM users WHERE id = $1", approval.RequestedBy).Scan(&approval.RequesterName)

	// Get decider name if exists
	if approval.DecidedBy != nil {
		r.db.QueryRow("SELECT name FROM users WHERE id = $1", *approval.DecidedBy).Scan(&approval.DeciderName)
	}
}
