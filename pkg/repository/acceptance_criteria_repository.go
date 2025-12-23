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

// AcceptanceCriteriaRepository handles database operations for acceptance criteria
type AcceptanceCriteriaRepository struct {
	db *sql.DB
}

// NewAcceptanceCriteriaRepository creates a new acceptance criteria repository
func NewAcceptanceCriteriaRepository(db *sql.DB) *AcceptanceCriteriaRepository {
	return &AcceptanceCriteriaRepository{db: db}
}

// Create creates new acceptance criteria
func (r *AcceptanceCriteriaRepository) Create(req models.CreateAcceptanceCriteriaRequest, userID int) (*models.AcceptanceCriteria, error) {
	var ac models.AcceptanceCriteria

	err := r.db.QueryRow(`
		INSERT INTO acceptance_criteria (criteria_id, entity_type, entity_id, title, description,
		                                  criteria_format, given_clause, when_clause, then_clause,
		                                  metric_name, metric_target, priority, created_by)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
		RETURNING id, criteria_id, entity_type, entity_id, title, description,
		          criteria_format, given_clause, when_clause, then_clause,
		          metric_name, metric_target, metric_actual, priority, status,
		          verified_by, verified_at, verification_notes, created_by,
		          created_at, updated_at
	`, req.CriteriaID, req.EntityType, req.EntityID, req.Title, req.Description,
		req.CriteriaFormat, nullIfEmpty(req.GivenClause), nullIfEmpty(req.WhenClause),
		nullIfEmpty(req.ThenClause), nullIfEmpty(req.MetricName), nullIfEmpty(req.MetricTarget),
		req.Priority, userID).Scan(
		&ac.ID, &ac.CriteriaID, &ac.EntityType, &ac.EntityID, &ac.Title,
		&ac.Description, &ac.CriteriaFormat, &ac.GivenClause, &ac.WhenClause,
		&ac.ThenClause, &ac.MetricName, &ac.MetricTarget, &ac.MetricActual,
		&ac.Priority, &ac.Status, &ac.VerifiedBy, &ac.VerifiedAt,
		&ac.VerificationNotes, &ac.CreatedBy, &ac.CreatedAt, &ac.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create acceptance criteria: %w", err)
	}

	return &ac, nil
}

// GetByID retrieves acceptance criteria by ID
func (r *AcceptanceCriteriaRepository) GetByID(id int) (*models.AcceptanceCriteria, error) {
	var ac models.AcceptanceCriteria

	err := r.db.QueryRow(`
		SELECT id, criteria_id, entity_type, entity_id, title, description,
		       criteria_format, given_clause, when_clause, then_clause,
		       metric_name, metric_target, metric_actual, priority, status,
		       verified_by, verified_at, verification_notes, created_by,
		       created_at, updated_at
		FROM acceptance_criteria
		WHERE id = $1
	`, id).Scan(
		&ac.ID, &ac.CriteriaID, &ac.EntityType, &ac.EntityID, &ac.Title,
		&ac.Description, &ac.CriteriaFormat, &ac.GivenClause, &ac.WhenClause,
		&ac.ThenClause, &ac.MetricName, &ac.MetricTarget, &ac.MetricActual,
		&ac.Priority, &ac.Status, &ac.VerifiedBy, &ac.VerifiedAt,
		&ac.VerificationNotes, &ac.CreatedBy, &ac.CreatedAt, &ac.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get acceptance criteria: %w", err)
	}

	return &ac, nil
}

// GetByEntity retrieves all acceptance criteria for a specific entity
func (r *AcceptanceCriteriaRepository) GetByEntity(entityType string, entityID int) ([]models.AcceptanceCriteria, error) {
	rows, err := r.db.Query(`
		SELECT id, criteria_id, entity_type, entity_id, title, description,
		       criteria_format, given_clause, when_clause, then_clause,
		       metric_name, metric_target, metric_actual, priority, status,
		       verified_by, verified_at, verification_notes, created_by,
		       created_at, updated_at
		FROM acceptance_criteria
		WHERE entity_type = $1 AND entity_id = $2
		ORDER BY priority, created_at
	`, entityType, entityID)
	if err != nil {
		return nil, fmt.Errorf("failed to query acceptance criteria: %w", err)
	}
	defer rows.Close()

	var criteria []models.AcceptanceCriteria
	for rows.Next() {
		var ac models.AcceptanceCriteria
		err := rows.Scan(
			&ac.ID, &ac.CriteriaID, &ac.EntityType, &ac.EntityID, &ac.Title,
			&ac.Description, &ac.CriteriaFormat, &ac.GivenClause, &ac.WhenClause,
			&ac.ThenClause, &ac.MetricName, &ac.MetricTarget, &ac.MetricActual,
			&ac.Priority, &ac.Status, &ac.VerifiedBy, &ac.VerifiedAt,
			&ac.VerificationNotes, &ac.CreatedBy, &ac.CreatedAt, &ac.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan acceptance criteria: %w", err)
		}
		criteria = append(criteria, ac)
	}

	return criteria, nil
}

// Update updates acceptance criteria
func (r *AcceptanceCriteriaRepository) Update(id int, req models.UpdateAcceptanceCriteriaRequest) (*models.AcceptanceCriteria, error) {
	// Build dynamic update query
	query := "UPDATE acceptance_criteria SET "
	args := []interface{}{}
	argPos := 1

	if req.Title != nil {
		query += fmt.Sprintf("title = $%d, ", argPos)
		args = append(args, *req.Title)
		argPos++
	}
	if req.Description != nil {
		query += fmt.Sprintf("description = $%d, ", argPos)
		args = append(args, *req.Description)
		argPos++
	}
	if req.CriteriaFormat != nil {
		query += fmt.Sprintf("criteria_format = $%d, ", argPos)
		args = append(args, *req.CriteriaFormat)
		argPos++
	}
	if req.GivenClause != nil {
		query += fmt.Sprintf("given_clause = $%d, ", argPos)
		args = append(args, *req.GivenClause)
		argPos++
	}
	if req.WhenClause != nil {
		query += fmt.Sprintf("when_clause = $%d, ", argPos)
		args = append(args, *req.WhenClause)
		argPos++
	}
	if req.ThenClause != nil {
		query += fmt.Sprintf("then_clause = $%d, ", argPos)
		args = append(args, *req.ThenClause)
		argPos++
	}
	if req.MetricName != nil {
		query += fmt.Sprintf("metric_name = $%d, ", argPos)
		args = append(args, *req.MetricName)
		argPos++
	}
	if req.MetricTarget != nil {
		query += fmt.Sprintf("metric_target = $%d, ", argPos)
		args = append(args, *req.MetricTarget)
		argPos++
	}
	if req.MetricActual != nil {
		query += fmt.Sprintf("metric_actual = $%d, ", argPos)
		args = append(args, *req.MetricActual)
		argPos++
	}
	if req.Priority != nil {
		query += fmt.Sprintf("priority = $%d, ", argPos)
		args = append(args, *req.Priority)
		argPos++
	}
	if req.Status != nil {
		query += fmt.Sprintf("status = $%d, ", argPos)
		args = append(args, *req.Status)
		argPos++
	}
	if req.VerificationNotes != nil {
		query += fmt.Sprintf("verification_notes = $%d, ", argPos)
		args = append(args, *req.VerificationNotes)
		argPos++
	}

	query += fmt.Sprintf("updated_at = CURRENT_TIMESTAMP WHERE id = $%d", argPos)
	args = append(args, id)

	_, err := r.db.Exec(query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to update acceptance criteria: %w", err)
	}

	return r.GetByID(id)
}

// Verify verifies acceptance criteria
func (r *AcceptanceCriteriaRepository) Verify(id int, userID int, req models.VerifyAcceptanceCriteriaRequest) (*models.AcceptanceCriteria, error) {
	_, err := r.db.Exec(`
		UPDATE acceptance_criteria
		SET status = $1, metric_actual = COALESCE($2, metric_actual),
		    verification_notes = COALESCE($3, verification_notes),
		    verified_by = $4, verified_at = CURRENT_TIMESTAMP,
		    updated_at = CURRENT_TIMESTAMP
		WHERE id = $5
	`, req.Status, nullIfEmpty(req.MetricActual), nullIfEmpty(req.VerificationNotes), userID, id)
	if err != nil {
		return nil, fmt.Errorf("failed to verify acceptance criteria: %w", err)
	}

	return r.GetByID(id)
}

// Delete deletes acceptance criteria
func (r *AcceptanceCriteriaRepository) Delete(id int) error {
	_, err := r.db.Exec("DELETE FROM acceptance_criteria WHERE id = $1", id)
	if err != nil {
		return fmt.Errorf("failed to delete acceptance criteria: %w", err)
	}
	return nil
}

// GetSummary returns a summary of acceptance criteria status for an entity
func (r *AcceptanceCriteriaRepository) GetSummary(entityType string, entityID int) (*models.AcceptanceCriteriaSummary, error) {
	var summary models.AcceptanceCriteriaSummary
	summary.EntityType = entityType
	summary.EntityID = entityID

	err := r.db.QueryRow(`
		SELECT
			COUNT(*) as total,
			COUNT(*) FILTER (WHERE status = 'passed') as passed,
			COUNT(*) FILTER (WHERE status = 'failed') as failed,
			COUNT(*) FILTER (WHERE status = 'pending') as pending,
			COUNT(*) FILTER (WHERE status = 'blocked') as blocked,
			COUNT(*) FILTER (WHERE status = 'skipped') as skipped
		FROM acceptance_criteria
		WHERE entity_type = $1 AND entity_id = $2
	`, entityType, entityID).Scan(
		&summary.TotalCount, &summary.PassedCount, &summary.FailedCount,
		&summary.PendingCount, &summary.BlockedCount, &summary.SkippedCount,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get summary: %w", err)
	}

	if summary.TotalCount > 0 {
		summary.Percentage = float64(summary.PassedCount) / float64(summary.TotalCount) * 100
	}

	return &summary, nil
}

// GetAll retrieves all acceptance criteria with optional filters
func (r *AcceptanceCriteriaRepository) GetAll(entityType string, status string) ([]models.AcceptanceCriteria, error) {
	query := `
		SELECT ac.id, ac.criteria_id, ac.entity_type, ac.entity_id, ac.title, ac.description,
		       ac.criteria_format, ac.given_clause, ac.when_clause, ac.then_clause,
		       ac.metric_name, ac.metric_target, ac.metric_actual, ac.priority, ac.status,
		       ac.verified_by, ac.verified_at, ac.verification_notes, ac.created_by,
		       ac.created_at, ac.updated_at
		FROM acceptance_criteria ac
		WHERE 1=1
	`
	args := []interface{}{}
	argPos := 1

	if entityType != "" {
		query += fmt.Sprintf(" AND ac.entity_type = $%d", argPos)
		args = append(args, entityType)
		argPos++
	}
	if status != "" {
		query += fmt.Sprintf(" AND ac.status = $%d", argPos)
		args = append(args, status)
		argPos++
	}

	query += " ORDER BY ac.priority, ac.created_at"

	rows, err := r.db.Query(query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query acceptance criteria: %w", err)
	}
	defer rows.Close()

	var criteria []models.AcceptanceCriteria
	for rows.Next() {
		var ac models.AcceptanceCriteria
		err := rows.Scan(
			&ac.ID, &ac.CriteriaID, &ac.EntityType, &ac.EntityID, &ac.Title,
			&ac.Description, &ac.CriteriaFormat, &ac.GivenClause, &ac.WhenClause,
			&ac.ThenClause, &ac.MetricName, &ac.MetricTarget, &ac.MetricActual,
			&ac.Priority, &ac.Status, &ac.VerifiedBy, &ac.VerifiedAt,
			&ac.VerificationNotes, &ac.CreatedBy, &ac.CreatedAt, &ac.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan acceptance criteria: %w", err)
		}
		criteria = append(criteria, ac)
	}

	return criteria, nil
}
