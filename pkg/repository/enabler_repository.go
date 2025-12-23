// IntentR - Copyright 2025 James Reynolds
//
// This file is part of IntentR.
// You may use this file under either:
//   - The AGPLv3 Open Source License, OR
//   - The IntentR Commercial License
// See the LICENSE.AGPL and LICENSE.COMMERCIAL files for details.

package repository

import (
	"database/sql"
	"fmt"

	"github.com/jareynolds/ubecode/pkg/models"
)

// EnablerRepository handles database operations for enablers
type EnablerRepository struct {
	db *sql.DB
}

// NewEnablerRepository creates a new enabler repository
func NewEnablerRepository(db *sql.DB) *EnablerRepository {
	return &EnablerRepository{db: db}
}

// Create creates a new enabler
func (r *EnablerRepository) Create(req models.CreateEnablerRequest, userID int) (*models.EnablerWithDetails, error) {
	var enabler models.Enabler

	techSpecs := req.TechnicalSpecs
	if techSpecs == nil {
		techSpecs = []byte("{}")
	}

	err := r.db.QueryRow(`
		INSERT INTO enablers (enabler_id, capability_id, name, purpose, owner, priority,
		                      analysis_review_required, code_review_required, technical_specs, created_by)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING id, enabler_id, capability_id, name, purpose, owner, status, approval_status,
		          workflow_stage, priority, analysis_review_required, code_review_required,
		          technical_specs, created_by, created_at, updated_at, is_active
	`, req.EnablerID, req.CapabilityID, req.Name, req.Purpose, req.Owner, req.Priority,
		req.AnalysisReviewRequired, req.CodeReviewRequired, techSpecs, userID).Scan(
		&enabler.ID, &enabler.EnablerID, &enabler.CapabilityID, &enabler.Name,
		&enabler.Purpose, &enabler.Owner, &enabler.Status, &enabler.ApprovalStatus,
		&enabler.WorkflowStage, &enabler.Priority, &enabler.AnalysisReviewRequired,
		&enabler.CodeReviewRequired, &enabler.TechnicalSpecs, &enabler.CreatedBy,
		&enabler.CreatedAt, &enabler.UpdatedAt, &enabler.IsActive,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create enabler: %w", err)
	}

	return r.GetByID(enabler.ID)
}

// GetAll retrieves all active enablers
func (r *EnablerRepository) GetAll() ([]models.Enabler, error) {
	rows, err := r.db.Query(`
		SELECT e.id, e.enabler_id, e.capability_id, e.name, e.purpose, e.owner, e.status,
		       e.approval_status, e.workflow_stage, e.priority, e.analysis_review_required,
		       e.code_review_required, e.technical_specs, e.created_by, e.created_at,
		       e.updated_at, e.is_active
		FROM enablers e
		WHERE e.is_active = true
		ORDER BY e.created_at DESC
	`)
	if err != nil {
		return nil, fmt.Errorf("failed to query enablers: %w", err)
	}
	defer rows.Close()

	var enablers []models.Enabler
	for rows.Next() {
		var e models.Enabler
		err := rows.Scan(
			&e.ID, &e.EnablerID, &e.CapabilityID, &e.Name, &e.Purpose, &e.Owner,
			&e.Status, &e.ApprovalStatus, &e.WorkflowStage, &e.Priority,
			&e.AnalysisReviewRequired, &e.CodeReviewRequired, &e.TechnicalSpecs,
			&e.CreatedBy, &e.CreatedAt, &e.UpdatedAt, &e.IsActive,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan enabler: %w", err)
		}
		enablers = append(enablers, e)
	}

	return enablers, nil
}

// GetByCapabilityID retrieves all enablers for a specific capability
func (r *EnablerRepository) GetByCapabilityID(capabilityID int) ([]models.Enabler, error) {
	rows, err := r.db.Query(`
		SELECT e.id, e.enabler_id, e.capability_id, e.name, e.purpose, e.owner, e.status,
		       e.approval_status, e.workflow_stage, e.priority, e.analysis_review_required,
		       e.code_review_required, e.technical_specs, e.created_by, e.created_at,
		       e.updated_at, e.is_active
		FROM enablers e
		WHERE e.capability_id = $1 AND e.is_active = true
		ORDER BY e.created_at DESC
	`, capabilityID)
	if err != nil {
		return nil, fmt.Errorf("failed to query enablers: %w", err)
	}
	defer rows.Close()

	var enablers []models.Enabler
	for rows.Next() {
		var e models.Enabler
		err := rows.Scan(
			&e.ID, &e.EnablerID, &e.CapabilityID, &e.Name, &e.Purpose, &e.Owner,
			&e.Status, &e.ApprovalStatus, &e.WorkflowStage, &e.Priority,
			&e.AnalysisReviewRequired, &e.CodeReviewRequired, &e.TechnicalSpecs,
			&e.CreatedBy, &e.CreatedAt, &e.UpdatedAt, &e.IsActive,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan enabler: %w", err)
		}
		enablers = append(enablers, e)
	}

	return enablers, nil
}

// GetByID retrieves an enabler with all its details
func (r *EnablerRepository) GetByID(id int) (*models.EnablerWithDetails, error) {
	var e models.EnablerWithDetails

	// Get enabler with capability name
	err := r.db.QueryRow(`
		SELECT e.id, e.enabler_id, e.capability_id, e.name, e.purpose, e.owner, e.status,
		       e.approval_status, e.workflow_stage, e.priority, e.analysis_review_required,
		       e.code_review_required, e.technical_specs, e.created_by, e.created_at,
		       e.updated_at, e.is_active, c.name as capability_name
		FROM enablers e
		LEFT JOIN capabilities c ON e.capability_id = c.id
		WHERE e.id = $1
	`, id).Scan(
		&e.ID, &e.EnablerID, &e.CapabilityID, &e.Name, &e.Purpose, &e.Owner,
		&e.Status, &e.ApprovalStatus, &e.WorkflowStage, &e.Priority,
		&e.AnalysisReviewRequired, &e.CodeReviewRequired, &e.TechnicalSpecs,
		&e.CreatedBy, &e.CreatedAt, &e.UpdatedAt, &e.IsActive, &e.CapabilityName,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get enabler: %w", err)
	}

	// Get requirements
	reqRows, err := r.db.Query(`
		SELECT id, requirement_id, enabler_id, name, description, requirement_type,
		       nfr_category, status, approval_status, priority, completed,
		       verified_by, verified_at, notes, created_by, created_at, updated_at
		FROM enabler_requirements
		WHERE enabler_id = $1
		ORDER BY created_at DESC
	`, id)
	if err != nil {
		return nil, fmt.Errorf("failed to query requirements: %w", err)
	}
	defer reqRows.Close()

	for reqRows.Next() {
		var req models.EnablerRequirement
		err := reqRows.Scan(
			&req.ID, &req.RequirementID, &req.EnablerID, &req.Name, &req.Description,
			&req.RequirementType, &req.NFRCategory, &req.Status, &req.ApprovalStatus,
			&req.Priority, &req.Completed, &req.VerifiedBy, &req.VerifiedAt,
			&req.Notes, &req.CreatedBy, &req.CreatedAt, &req.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan requirement: %w", err)
		}
		e.Requirements = append(e.Requirements, req)
	}

	// Get acceptance criteria
	acRows, err := r.db.Query(`
		SELECT id, criteria_id, entity_type, entity_id, title, description,
		       criteria_format, given_clause, when_clause, then_clause,
		       metric_name, metric_target, metric_actual, priority, status,
		       verified_by, verified_at, verification_notes, created_by,
		       created_at, updated_at
		FROM acceptance_criteria
		WHERE entity_type = 'enabler' AND entity_id = $1
		ORDER BY created_at DESC
	`, id)
	if err != nil {
		return nil, fmt.Errorf("failed to query acceptance criteria: %w", err)
	}
	defer acRows.Close()

	for acRows.Next() {
		var ac models.AcceptanceCriteria
		err := acRows.Scan(
			&ac.ID, &ac.CriteriaID, &ac.EntityType, &ac.EntityID, &ac.Title,
			&ac.Description, &ac.CriteriaFormat, &ac.GivenClause, &ac.WhenClause,
			&ac.ThenClause, &ac.MetricName, &ac.MetricTarget, &ac.MetricActual,
			&ac.Priority, &ac.Status, &ac.VerifiedBy, &ac.VerifiedAt,
			&ac.VerificationNotes, &ac.CreatedBy, &ac.CreatedAt, &ac.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan acceptance criteria: %w", err)
		}
		e.Criteria = append(e.Criteria, ac)
	}

	return &e, nil
}

// Update updates an enabler
func (r *EnablerRepository) Update(id int, req models.UpdateEnablerRequest) (*models.EnablerWithDetails, error) {
	// Build dynamic update query
	query := "UPDATE enablers SET "
	args := []interface{}{}
	argPos := 1

	if req.Name != nil {
		query += fmt.Sprintf("name = $%d, ", argPos)
		args = append(args, *req.Name)
		argPos++
	}
	if req.Purpose != nil {
		query += fmt.Sprintf("purpose = $%d, ", argPos)
		args = append(args, *req.Purpose)
		argPos++
	}
	if req.Owner != nil {
		query += fmt.Sprintf("owner = $%d, ", argPos)
		args = append(args, *req.Owner)
		argPos++
	}
	if req.Status != nil {
		query += fmt.Sprintf("status = $%d, ", argPos)
		args = append(args, *req.Status)
		argPos++
	}
	if req.ApprovalStatus != nil {
		query += fmt.Sprintf("approval_status = $%d, ", argPos)
		args = append(args, *req.ApprovalStatus)
		argPos++
	}
	if req.WorkflowStage != nil {
		query += fmt.Sprintf("workflow_stage = $%d, ", argPos)
		args = append(args, *req.WorkflowStage)
		argPos++
	}
	if req.Priority != nil {
		query += fmt.Sprintf("priority = $%d, ", argPos)
		args = append(args, *req.Priority)
		argPos++
	}
	if req.AnalysisReviewRequired != nil {
		query += fmt.Sprintf("analysis_review_required = $%d, ", argPos)
		args = append(args, *req.AnalysisReviewRequired)
		argPos++
	}
	if req.CodeReviewRequired != nil {
		query += fmt.Sprintf("code_review_required = $%d, ", argPos)
		args = append(args, *req.CodeReviewRequired)
		argPos++
	}
	if req.TechnicalSpecs != nil {
		query += fmt.Sprintf("technical_specs = $%d, ", argPos)
		args = append(args, req.TechnicalSpecs)
		argPos++
	}
	if req.IsActive != nil {
		query += fmt.Sprintf("is_active = $%d, ", argPos)
		args = append(args, *req.IsActive)
		argPos++
	}

	query += fmt.Sprintf("updated_at = CURRENT_TIMESTAMP WHERE id = $%d", argPos)
	args = append(args, id)

	_, err := r.db.Exec(query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to update enabler: %w", err)
	}

	return r.GetByID(id)
}

// Delete soft deletes an enabler
func (r *EnablerRepository) Delete(id int) error {
	_, err := r.db.Exec("UPDATE enablers SET is_active = false WHERE id = $1", id)
	if err != nil {
		return fmt.Errorf("failed to delete enabler: %w", err)
	}
	return nil
}

// CreateRequirement creates a new requirement for an enabler
func (r *EnablerRepository) CreateRequirement(req models.CreateRequirementRequest, userID int) (*models.EnablerRequirement, error) {
	var requirement models.EnablerRequirement

	err := r.db.QueryRow(`
		INSERT INTO enabler_requirements (requirement_id, enabler_id, name, description,
		                                   requirement_type, nfr_category, priority, notes, created_by)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id, requirement_id, enabler_id, name, description, requirement_type,
		          nfr_category, status, approval_status, priority, completed,
		          verified_by, verified_at, notes, created_by, created_at, updated_at
	`, req.RequirementID, req.EnablerID, req.Name, req.Description,
		req.RequirementType, nullIfEmpty(req.NFRCategory), req.Priority, nullIfEmpty(req.Notes), userID).Scan(
		&requirement.ID, &requirement.RequirementID, &requirement.EnablerID,
		&requirement.Name, &requirement.Description, &requirement.RequirementType,
		&requirement.NFRCategory, &requirement.Status, &requirement.ApprovalStatus,
		&requirement.Priority, &requirement.Completed, &requirement.VerifiedBy,
		&requirement.VerifiedAt, &requirement.Notes, &requirement.CreatedBy,
		&requirement.CreatedAt, &requirement.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create requirement: %w", err)
	}

	return &requirement, nil
}

// UpdateRequirement updates a requirement
func (r *EnablerRepository) UpdateRequirement(id int, req models.UpdateRequirementRequest) (*models.EnablerRequirement, error) {
	// Build dynamic update query
	query := "UPDATE enabler_requirements SET "
	args := []interface{}{}
	argPos := 1

	if req.Name != nil {
		query += fmt.Sprintf("name = $%d, ", argPos)
		args = append(args, *req.Name)
		argPos++
	}
	if req.Description != nil {
		query += fmt.Sprintf("description = $%d, ", argPos)
		args = append(args, *req.Description)
		argPos++
	}
	if req.RequirementType != nil {
		query += fmt.Sprintf("requirement_type = $%d, ", argPos)
		args = append(args, *req.RequirementType)
		argPos++
	}
	if req.NFRCategory != nil {
		query += fmt.Sprintf("nfr_category = $%d, ", argPos)
		args = append(args, *req.NFRCategory)
		argPos++
	}
	if req.Status != nil {
		query += fmt.Sprintf("status = $%d, ", argPos)
		args = append(args, *req.Status)
		argPos++
	}
	if req.ApprovalStatus != nil {
		query += fmt.Sprintf("approval_status = $%d, ", argPos)
		args = append(args, *req.ApprovalStatus)
		argPos++
	}
	if req.Priority != nil {
		query += fmt.Sprintf("priority = $%d, ", argPos)
		args = append(args, *req.Priority)
		argPos++
	}
	if req.Completed != nil {
		query += fmt.Sprintf("completed = $%d, ", argPos)
		args = append(args, *req.Completed)
		argPos++
	}
	if req.Notes != nil {
		query += fmt.Sprintf("notes = $%d, ", argPos)
		args = append(args, *req.Notes)
		argPos++
	}

	query += fmt.Sprintf("updated_at = CURRENT_TIMESTAMP WHERE id = $%d", argPos)
	args = append(args, id)

	_, err := r.db.Exec(query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to update requirement: %w", err)
	}

	return r.GetRequirementByID(id)
}

// GetRequirementByID retrieves a requirement by ID
func (r *EnablerRepository) GetRequirementByID(id int) (*models.EnablerRequirement, error) {
	var req models.EnablerRequirement

	err := r.db.QueryRow(`
		SELECT id, requirement_id, enabler_id, name, description, requirement_type,
		       nfr_category, status, approval_status, priority, completed,
		       verified_by, verified_at, notes, created_by, created_at, updated_at
		FROM enabler_requirements
		WHERE id = $1
	`, id).Scan(
		&req.ID, &req.RequirementID, &req.EnablerID, &req.Name, &req.Description,
		&req.RequirementType, &req.NFRCategory, &req.Status, &req.ApprovalStatus,
		&req.Priority, &req.Completed, &req.VerifiedBy, &req.VerifiedAt,
		&req.Notes, &req.CreatedBy, &req.CreatedAt, &req.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get requirement: %w", err)
	}

	return &req, nil
}

// DeleteRequirement deletes a requirement
func (r *EnablerRepository) DeleteRequirement(id int) error {
	_, err := r.db.Exec("DELETE FROM enabler_requirements WHERE id = $1", id)
	if err != nil {
		return fmt.Errorf("failed to delete requirement: %w", err)
	}
	return nil
}

// VerifyRequirement marks a requirement as verified
func (r *EnablerRepository) VerifyRequirement(id int, userID int, req models.VerifyRequirementRequest) (*models.EnablerRequirement, error) {
	_, err := r.db.Exec(`
		UPDATE enabler_requirements
		SET completed = $1, verified_by = $2, verified_at = CURRENT_TIMESTAMP,
		    notes = COALESCE($3, notes), status = CASE WHEN $1 THEN 'verified' ELSE status END,
		    updated_at = CURRENT_TIMESTAMP
		WHERE id = $4
	`, req.Completed, userID, nullIfEmpty(req.Notes), id)
	if err != nil {
		return nil, fmt.Errorf("failed to verify requirement: %w", err)
	}

	return r.GetRequirementByID(id)
}

// Helper function to convert empty string to nil
func nullIfEmpty(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}
