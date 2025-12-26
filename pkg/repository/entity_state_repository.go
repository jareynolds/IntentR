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
	"fmt"

	"github.com/jareynolds/intentr/pkg/models"
)

// EntityStateRepository handles database operations for entity state management
type EntityStateRepository struct {
	db *sql.DB
}

// NewEntityStateRepository creates a new entity state repository
func NewEntityStateRepository(db *sql.DB) *EntityStateRepository {
	return &EntityStateRepository{db: db}
}

// ============================================================================
// CAPABILITY STATE OPERATIONS
// ============================================================================

// GetCapabilityState retrieves a capability's state by capability_id
func (r *EntityStateRepository) GetCapabilityState(capabilityID string) (*models.Capability, error) {
	var cap models.Capability
	var lifecycleState, workflowStage, stageStatus, approvalStatus, workspaceID, filePath sql.NullString
	var version sql.NullInt64

	err := r.db.QueryRow(`
		SELECT id, capability_id, name, status, description, purpose, storyboard_reference,
		       created_at, updated_at, created_by, is_active,
		       lifecycle_state, workflow_stage, stage_status, approval_status,
		       version, workspace_id, file_path
		FROM capabilities
		WHERE capability_id = $1 AND is_active = true
	`, capabilityID).Scan(
		&cap.ID, &cap.CapabilityID, &cap.Name, &cap.Status, &cap.Description,
		&cap.Purpose, &cap.StoryboardReference, &cap.CreatedAt, &cap.UpdatedAt,
		&cap.CreatedBy, &cap.IsActive,
		&lifecycleState, &workflowStage, &stageStatus, &approvalStatus,
		&version, &workspaceID, &filePath,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get capability state: %w", err)
	}

	cap.LifecycleState = lifecycleState.String
	cap.WorkflowStage = workflowStage.String
	cap.StageStatus = stageStatus.String
	cap.ApprovalStatus = approvalStatus.String
	cap.Version = int(version.Int64)
	cap.WorkspaceID = workspaceID.String
	cap.FilePath = filePath.String

	return &cap, nil
}

// GetCapabilitiesByWorkspace retrieves all capabilities for a workspace
func (r *EntityStateRepository) GetCapabilitiesByWorkspace(workspaceID string) ([]models.Capability, error) {
	rows, err := r.db.Query(`
		SELECT id, capability_id, name, status, description, purpose, storyboard_reference,
		       created_at, updated_at, created_by, is_active,
		       lifecycle_state, workflow_stage, stage_status, approval_status,
		       version, workspace_id, file_path
		FROM capabilities
		WHERE workspace_id = $1 AND is_active = true
		ORDER BY created_at DESC
	`, workspaceID)
	if err != nil {
		return nil, fmt.Errorf("failed to query capabilities: %w", err)
	}
	defer rows.Close()

	var capabilities []models.Capability
	for rows.Next() {
		var cap models.Capability
		var lifecycleState, workflowStage, stageStatus, approvalStatus, wsID, filePath sql.NullString
		var version sql.NullInt64

		err := rows.Scan(
			&cap.ID, &cap.CapabilityID, &cap.Name, &cap.Status, &cap.Description,
			&cap.Purpose, &cap.StoryboardReference, &cap.CreatedAt, &cap.UpdatedAt,
			&cap.CreatedBy, &cap.IsActive,
			&lifecycleState, &workflowStage, &stageStatus, &approvalStatus,
			&version, &wsID, &filePath,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan capability: %w", err)
		}

		cap.LifecycleState = lifecycleState.String
		cap.WorkflowStage = workflowStage.String
		cap.StageStatus = stageStatus.String
		cap.ApprovalStatus = approvalStatus.String
		cap.Version = int(version.Int64)
		cap.WorkspaceID = wsID.String
		cap.FilePath = filePath.String

		capabilities = append(capabilities, cap)
	}

	return capabilities, nil
}

// UpdateCapabilityState updates a capability's state with optimistic locking
func (r *EntityStateRepository) UpdateCapabilityState(capabilityID string, req models.UpdateEntityStateRequest, userID *int) (*models.Capability, error) {
	tx, err := r.db.Begin()
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	// Check current version for optimistic locking
	var currentVersion int
	var dbID int
	err = tx.QueryRow(`SELECT id, version FROM capabilities WHERE capability_id = $1 AND is_active = true`, capabilityID).Scan(&dbID, &currentVersion)
	if err != nil {
		return nil, fmt.Errorf("capability not found: %w", err)
	}

	if currentVersion != req.Version {
		return nil, &models.OptimisticLockError{
			EntityType:      string(models.EntityTypeCapabilityState),
			EntityID:        capabilityID,
			ExpectedVersion: req.Version,
			ActualVersion:   currentVersion,
		}
	}

	// Build dynamic update query
	query := "UPDATE capabilities SET updated_at = CURRENT_TIMESTAMP"
	args := []interface{}{}
	argPos := 1

	// Track changes for audit log
	var changes []struct {
		field    string
		oldValue string
		newValue string
	}

	if req.LifecycleState != nil {
		query += fmt.Sprintf(", lifecycle_state = $%d", argPos)
		args = append(args, *req.LifecycleState)
		argPos++
	}
	if req.WorkflowStage != nil {
		query += fmt.Sprintf(", workflow_stage = $%d", argPos)
		args = append(args, *req.WorkflowStage)
		argPos++
	}
	if req.StageStatus != nil {
		query += fmt.Sprintf(", stage_status = $%d", argPos)
		args = append(args, *req.StageStatus)
		argPos++
	}
	if req.ApprovalStatus != nil {
		query += fmt.Sprintf(", approval_status = $%d", argPos)
		args = append(args, *req.ApprovalStatus)
		argPos++
	}

	query += fmt.Sprintf(" WHERE capability_id = $%d AND version = $%d RETURNING version", argPos, argPos+1)
	args = append(args, capabilityID, req.Version)

	var newVersion int
	err = tx.QueryRow(query, args...).Scan(&newVersion)
	if err != nil {
		return nil, fmt.Errorf("failed to update capability state: %w", err)
	}

	// Log state changes (simplified - just log the update for now)
	if len(changes) > 0 || req.ChangeReason != "" {
		_, err = tx.Exec(`
			INSERT INTO entity_state_changes (entity_type, entity_id, field_changed, old_value, new_value, change_reason, changed_by)
			VALUES ($1, $2, $3, $4, $5, $6, $7)
		`, string(models.EntityTypeCapabilityState), capabilityID, "state_update", "", "", req.ChangeReason, userID)
		if err != nil {
			// Log error but don't fail the transaction
			fmt.Printf("Warning: failed to log state change: %v\n", err)
		}
	}

	if err = tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	return r.GetCapabilityState(capabilityID)
}

// UpsertCapabilityFromFile creates or updates a capability from markdown file data
func (r *EntityStateRepository) UpsertCapabilityFromFile(cap models.Capability, userID *int) (*models.Capability, error) {
	tx, err := r.db.Begin()
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	// Try to find existing capability by capability_id
	var existingID int
	var existingVersion int
	err = tx.QueryRow(`SELECT id, version FROM capabilities WHERE capability_id = $1`, cap.CapabilityID).Scan(&existingID, &existingVersion)

	if err == sql.ErrNoRows {
		// Insert new capability
		err = tx.QueryRow(`
			INSERT INTO capabilities (
				capability_id, name, status, description, purpose, storyboard_reference,
				lifecycle_state, workflow_stage, stage_status, approval_status,
				workspace_id, file_path, created_by, version
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 1)
			RETURNING id
		`, cap.CapabilityID, cap.Name, cap.Status, cap.Description, cap.Purpose, cap.StoryboardReference,
			cap.LifecycleState, cap.WorkflowStage, cap.StageStatus, cap.ApprovalStatus,
			cap.WorkspaceID, cap.FilePath, userID,
		).Scan(&existingID)
		if err != nil {
			return nil, fmt.Errorf("failed to insert capability: %w", err)
		}
	} else if err != nil {
		return nil, fmt.Errorf("failed to check existing capability: %w", err)
	} else {
		// Update existing capability
		_, err = tx.Exec(`
			UPDATE capabilities SET
				name = $1, status = $2, description = $3, purpose = $4, storyboard_reference = $5,
				lifecycle_state = $6, workflow_stage = $7, stage_status = $8, approval_status = $9,
				workspace_id = $10, file_path = $11, updated_at = CURRENT_TIMESTAMP
			WHERE id = $12
		`, cap.Name, cap.Status, cap.Description, cap.Purpose, cap.StoryboardReference,
			cap.LifecycleState, cap.WorkflowStage, cap.StageStatus, cap.ApprovalStatus,
			cap.WorkspaceID, cap.FilePath, existingID,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to update capability: %w", err)
		}
	}

	if err = tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	return r.GetCapabilityState(cap.CapabilityID)
}

// ============================================================================
// ENABLER STATE OPERATIONS
// ============================================================================

// GetEnablerState retrieves an enabler's state by enabler_id
func (r *EntityStateRepository) GetEnablerState(enablerID string) (*models.Enabler, error) {
	var enb models.Enabler
	err := r.db.QueryRow(`
		SELECT id, enabler_id, capability_id, name, description, purpose, owner, priority,
		       created_at, updated_at, created_by, is_active,
		       lifecycle_state, workflow_stage, stage_status, approval_status,
		       version, workspace_id, file_path
		FROM enablers
		WHERE enabler_id = $1 AND is_active = true
	`, enablerID).Scan(
		&enb.ID, &enb.EnablerID, &enb.CapabilityID, &enb.Name, &enb.Description,
		&enb.Purpose, &enb.Owner, &enb.Priority, &enb.CreatedAt, &enb.UpdatedAt,
		&enb.CreatedBy, &enb.IsActive,
		&enb.LifecycleState, &enb.WorkflowStage, &enb.StageStatus, &enb.ApprovalStatus,
		&enb.Version, &enb.WorkspaceID, &enb.FilePath,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get enabler state: %w", err)
	}
	return &enb, nil
}

// GetEnablersByWorkspace retrieves all enablers for a workspace
func (r *EntityStateRepository) GetEnablersByWorkspace(workspaceID string) ([]models.Enabler, error) {
	rows, err := r.db.Query(`
		SELECT id, enabler_id, capability_id, name, description, purpose, owner, priority,
		       created_at, updated_at, created_by, is_active,
		       lifecycle_state, workflow_stage, stage_status, approval_status,
		       version, workspace_id, file_path
		FROM enablers
		WHERE workspace_id = $1 AND is_active = true
		ORDER BY created_at DESC
	`, workspaceID)
	if err != nil {
		return nil, fmt.Errorf("failed to query enablers: %w", err)
	}
	defer rows.Close()

	var enablers []models.Enabler
	for rows.Next() {
		var enb models.Enabler
		err := rows.Scan(
			&enb.ID, &enb.EnablerID, &enb.CapabilityID, &enb.Name, &enb.Description,
			&enb.Purpose, &enb.Owner, &enb.Priority, &enb.CreatedAt, &enb.UpdatedAt,
			&enb.CreatedBy, &enb.IsActive,
			&enb.LifecycleState, &enb.WorkflowStage, &enb.StageStatus, &enb.ApprovalStatus,
			&enb.Version, &enb.WorkspaceID, &enb.FilePath,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan enabler: %w", err)
		}
		enablers = append(enablers, enb)
	}

	return enablers, nil
}

// UpdateEnablerState updates an enabler's state with optimistic locking
func (r *EntityStateRepository) UpdateEnablerState(enablerID string, req models.UpdateEntityStateRequest, userID *int) (*models.Enabler, error) {
	tx, err := r.db.Begin()
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	// Check current version for optimistic locking
	var currentVersion int
	err = tx.QueryRow(`SELECT version FROM enablers WHERE enabler_id = $1 AND is_active = true`, enablerID).Scan(&currentVersion)
	if err != nil {
		return nil, fmt.Errorf("enabler not found: %w", err)
	}

	if currentVersion != req.Version {
		return nil, &models.OptimisticLockError{
			EntityType:      string(models.EntityTypeEnablerState),
			EntityID:        enablerID,
			ExpectedVersion: req.Version,
			ActualVersion:   currentVersion,
		}
	}

	// Build dynamic update query
	query := "UPDATE enablers SET updated_at = CURRENT_TIMESTAMP"
	args := []interface{}{}
	argPos := 1

	if req.LifecycleState != nil {
		query += fmt.Sprintf(", lifecycle_state = $%d", argPos)
		args = append(args, *req.LifecycleState)
		argPos++
	}
	if req.WorkflowStage != nil {
		query += fmt.Sprintf(", workflow_stage = $%d", argPos)
		args = append(args, *req.WorkflowStage)
		argPos++
	}
	if req.StageStatus != nil {
		query += fmt.Sprintf(", stage_status = $%d", argPos)
		args = append(args, *req.StageStatus)
		argPos++
	}
	if req.ApprovalStatus != nil {
		query += fmt.Sprintf(", approval_status = $%d", argPos)
		args = append(args, *req.ApprovalStatus)
		argPos++
	}

	query += fmt.Sprintf(" WHERE enabler_id = $%d AND version = $%d", argPos, argPos+1)
	args = append(args, enablerID, req.Version)

	_, err = tx.Exec(query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to update enabler state: %w", err)
	}

	if err = tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	return r.GetEnablerState(enablerID)
}

// CreateEnabler creates a new enabler
func (r *EntityStateRepository) CreateEnabler(req models.CreateEnablerRequest, userID *int) (*models.Enabler, error) {
	// Set defaults
	if req.LifecycleState == "" {
		req.LifecycleState = "active"
	}
	if req.WorkflowStage == "" {
		req.WorkflowStage = "specification"
	}
	if req.StageStatus == "" {
		req.StageStatus = "in_progress"
	}
	if req.ApprovalStatus == "" {
		req.ApprovalStatus = "pending"
	}

	var id int
	err := r.db.QueryRow(`
		INSERT INTO enablers (
			enabler_id, capability_id, name, description, purpose, owner, priority,
			lifecycle_state, workflow_stage, stage_status, approval_status,
			workspace_id, file_path, created_by, version
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 1)
		RETURNING id
	`, req.EnablerID, req.CapabilityID, req.Name, req.Description, req.Purpose, req.Owner, req.Priority,
		req.LifecycleState, req.WorkflowStage, req.StageStatus, req.ApprovalStatus,
		req.WorkspaceID, req.FilePath, userID,
	).Scan(&id)
	if err != nil {
		return nil, fmt.Errorf("failed to create enabler: %w", err)
	}

	return r.GetEnablerState(req.EnablerID)
}

// UpsertEnablerFromFile creates or updates an enabler from file data (for import)
// For updates, only state fields are modified; structural fields (capability_id, etc.) are preserved
// unless explicitly provided (non-zero/non-empty values).
func (r *EntityStateRepository) UpsertEnablerFromFile(enb models.Enabler, userID *int) (*models.Enabler, error) {
	tx, err := r.db.Begin()
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	// Try to find existing enabler by enabler_id
	var existingID int
	var existingCapabilityID int
	err = tx.QueryRow(`SELECT id, capability_id FROM enablers WHERE enabler_id = $1`, enb.EnablerID).Scan(&existingID, &existingCapabilityID)

	if err == sql.ErrNoRows {
		// Insert new enabler - capability_id is required for new enablers
		if enb.CapabilityID == 0 {
			return nil, fmt.Errorf("capability_id is required for new enablers")
		}
		err = tx.QueryRow(`
			INSERT INTO enablers (
				enabler_id, capability_id, name, description, purpose, owner, priority,
				lifecycle_state, workflow_stage, stage_status, approval_status,
				workspace_id, file_path, created_by, version
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 1)
			RETURNING id
		`, enb.EnablerID, enb.CapabilityID, enb.Name, enb.Description, enb.Purpose, enb.Owner, enb.Priority,
			enb.LifecycleState, enb.WorkflowStage, enb.StageStatus, enb.ApprovalStatus,
			enb.WorkspaceID, enb.FilePath, userID,
		).Scan(&existingID)
		if err != nil {
			return nil, fmt.Errorf("failed to insert enabler: %w", err)
		}
	} else if err != nil {
		return nil, fmt.Errorf("failed to check existing enabler: %w", err)
	} else {
		// Update existing enabler - only update state fields; preserve structural fields if not provided
		// If capability_id is 0 (not provided), keep the existing value
		capabilityIDToUse := existingCapabilityID
		if enb.CapabilityID != 0 {
			capabilityIDToUse = enb.CapabilityID
		}

		// For state-only updates (from approval pages), only name may be provided along with state fields.
		// We use conditional updates: keep existing value if new value is empty/zero.
		nameToUse := enb.Name
		if nameToUse == "" {
			// Don't update name if not provided - but we still need a value for the query
			// So we fetch it from the existing record
			var existingName string
			_ = tx.QueryRow(`SELECT name FROM enablers WHERE id = $1`, existingID).Scan(&existingName)
			nameToUse = existingName
		}

		_, err = tx.Exec(`
			UPDATE enablers SET
				capability_id = $1, name = $2,
				lifecycle_state = $3, workflow_stage = $4, stage_status = $5, approval_status = $6,
				workspace_id = COALESCE(NULLIF($7, ''), workspace_id),
				file_path = COALESCE(NULLIF($8, ''), file_path),
				description = COALESCE(NULLIF($9, ''), description),
				purpose = COALESCE(NULLIF($10, ''), purpose),
				owner = COALESCE(NULLIF($11, ''), owner),
				priority = COALESCE(NULLIF($12, ''), priority),
				updated_at = CURRENT_TIMESTAMP
			WHERE id = $13
		`, capabilityIDToUse, nameToUse,
			enb.LifecycleState, enb.WorkflowStage, enb.StageStatus, enb.ApprovalStatus,
			enb.WorkspaceID, enb.FilePath,
			enb.Description, enb.Purpose, enb.Owner, enb.Priority,
			existingID,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to update enabler: %w", err)
		}
	}

	if err = tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	return r.GetEnablerState(enb.EnablerID)
}

// ============================================================================
// STORY CARD STATE OPERATIONS
// ============================================================================

// GetStoryCardState retrieves a story card's state by card_id
func (r *EntityStateRepository) GetStoryCardState(cardID string) (*models.StoryCard, error) {
	var card models.StoryCard
	err := r.db.QueryRow(`
		SELECT id, card_id, title, description, card_type, image_url, position_x, position_y,
		       created_at, updated_at, created_by, is_active,
		       lifecycle_state, workflow_stage, stage_status, approval_status,
		       version, workspace_id, file_path
		FROM story_cards
		WHERE card_id = $1 AND is_active = true
	`, cardID).Scan(
		&card.ID, &card.CardID, &card.Title, &card.Description, &card.CardType,
		&card.ImageURL, &card.PositionX, &card.PositionY,
		&card.CreatedAt, &card.UpdatedAt, &card.CreatedBy, &card.IsActive,
		&card.LifecycleState, &card.WorkflowStage, &card.StageStatus, &card.ApprovalStatus,
		&card.Version, &card.WorkspaceID, &card.FilePath,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get story card state: %w", err)
	}
	return &card, nil
}

// GetStoryCardsByWorkspace retrieves all story cards for a workspace
func (r *EntityStateRepository) GetStoryCardsByWorkspace(workspaceID string) ([]models.StoryCard, error) {
	rows, err := r.db.Query(`
		SELECT id, card_id, title, description, card_type, image_url, position_x, position_y,
		       created_at, updated_at, created_by, is_active,
		       lifecycle_state, workflow_stage, stage_status, approval_status,
		       version, workspace_id, file_path
		FROM story_cards
		WHERE workspace_id = $1 AND is_active = true
		ORDER BY created_at DESC
	`, workspaceID)
	if err != nil {
		return nil, fmt.Errorf("failed to query story cards: %w", err)
	}
	defer rows.Close()

	var cards []models.StoryCard
	for rows.Next() {
		var card models.StoryCard
		err := rows.Scan(
			&card.ID, &card.CardID, &card.Title, &card.Description, &card.CardType,
			&card.ImageURL, &card.PositionX, &card.PositionY,
			&card.CreatedAt, &card.UpdatedAt, &card.CreatedBy, &card.IsActive,
			&card.LifecycleState, &card.WorkflowStage, &card.StageStatus, &card.ApprovalStatus,
			&card.Version, &card.WorkspaceID, &card.FilePath,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan story card: %w", err)
		}
		cards = append(cards, card)
	}

	return cards, nil
}

// UpdateStoryCardState updates a story card's state with optimistic locking
func (r *EntityStateRepository) UpdateStoryCardState(cardID string, req models.UpdateEntityStateRequest, userID *int) (*models.StoryCard, error) {
	tx, err := r.db.Begin()
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	// Check current version for optimistic locking
	var currentVersion int
	err = tx.QueryRow(`SELECT version FROM story_cards WHERE card_id = $1 AND is_active = true`, cardID).Scan(&currentVersion)
	if err != nil {
		return nil, fmt.Errorf("story card not found: %w", err)
	}

	if currentVersion != req.Version {
		return nil, &models.OptimisticLockError{
			EntityType:      string(models.EntityTypeStoryCardState),
			EntityID:        cardID,
			ExpectedVersion: req.Version,
			ActualVersion:   currentVersion,
		}
	}

	// Build dynamic update query
	query := "UPDATE story_cards SET updated_at = CURRENT_TIMESTAMP"
	args := []interface{}{}
	argPos := 1

	if req.LifecycleState != nil {
		query += fmt.Sprintf(", lifecycle_state = $%d", argPos)
		args = append(args, *req.LifecycleState)
		argPos++
	}
	if req.WorkflowStage != nil {
		query += fmt.Sprintf(", workflow_stage = $%d", argPos)
		args = append(args, *req.WorkflowStage)
		argPos++
	}
	if req.StageStatus != nil {
		query += fmt.Sprintf(", stage_status = $%d", argPos)
		args = append(args, *req.StageStatus)
		argPos++
	}
	if req.ApprovalStatus != nil {
		query += fmt.Sprintf(", approval_status = $%d", argPos)
		args = append(args, *req.ApprovalStatus)
		argPos++
	}

	query += fmt.Sprintf(" WHERE card_id = $%d AND version = $%d", argPos, argPos+1)
	args = append(args, cardID, req.Version)

	_, err = tx.Exec(query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to update story card state: %w", err)
	}

	if err = tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	return r.GetStoryCardState(cardID)
}

// CreateStoryCard creates a new story card
func (r *EntityStateRepository) CreateStoryCard(req models.CreateStoryCardRequest, userID *int) (*models.StoryCard, error) {
	// Set defaults
	if req.LifecycleState == "" {
		req.LifecycleState = "active"
	}
	if req.WorkflowStage == "" {
		req.WorkflowStage = "intent"
	}
	if req.StageStatus == "" {
		req.StageStatus = "in_progress"
	}
	if req.ApprovalStatus == "" {
		req.ApprovalStatus = "pending"
	}

	var id int
	err := r.db.QueryRow(`
		INSERT INTO story_cards (
			card_id, title, description, card_type, image_url, position_x, position_y,
			lifecycle_state, workflow_stage, stage_status, approval_status,
			workspace_id, file_path, created_by, version
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 1)
		RETURNING id
	`, req.CardID, req.Title, req.Description, req.CardType, req.ImageURL, req.PositionX, req.PositionY,
		req.LifecycleState, req.WorkflowStage, req.StageStatus, req.ApprovalStatus,
		req.WorkspaceID, req.FilePath, userID,
	).Scan(&id)
	if err != nil {
		return nil, fmt.Errorf("failed to create story card: %w", err)
	}

	return r.GetStoryCardState(req.CardID)
}

// UpsertStoryCard creates or updates a story card from file data (for import)
func (r *EntityStateRepository) UpsertStoryCard(card models.StoryCard, userID *int) (*models.StoryCard, error) {
	tx, err := r.db.Begin()
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	// Try to find existing story card by card_id
	var existingID int
	err = tx.QueryRow(`SELECT id FROM story_cards WHERE card_id = $1`, card.CardID).Scan(&existingID)

	if err == sql.ErrNoRows {
		// Insert new story card
		err = tx.QueryRow(`
			INSERT INTO story_cards (
				card_id, title, description, card_type, image_url, position_x, position_y,
				lifecycle_state, workflow_stage, stage_status, approval_status,
				workspace_id, file_path, created_by, version
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 1)
			RETURNING id
		`, card.CardID, card.Title, card.Description, card.CardType, card.ImageURL, card.PositionX, card.PositionY,
			card.LifecycleState, card.WorkflowStage, card.StageStatus, card.ApprovalStatus,
			card.WorkspaceID, card.FilePath, userID,
		).Scan(&existingID)
		if err != nil {
			return nil, fmt.Errorf("failed to insert story card: %w", err)
		}
	} else if err != nil {
		return nil, fmt.Errorf("failed to check existing story card: %w", err)
	} else {
		// Update existing story card
		_, err = tx.Exec(`
			UPDATE story_cards SET
				title = $1, description = $2, card_type = $3, image_url = $4, position_x = $5, position_y = $6,
				lifecycle_state = $7, workflow_stage = $8, stage_status = $9, approval_status = $10,
				workspace_id = $11, file_path = $12, updated_at = CURRENT_TIMESTAMP
			WHERE id = $13
		`, card.Title, card.Description, card.CardType, card.ImageURL, card.PositionX, card.PositionY,
			card.LifecycleState, card.WorkflowStage, card.StageStatus, card.ApprovalStatus,
			card.WorkspaceID, card.FilePath, existingID,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to update story card: %w", err)
		}
	}

	if err = tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	return r.GetStoryCardState(card.CardID)
}

// ============================================================================
// BULK OPERATIONS
// ============================================================================

// GetAllStateByWorkspace retrieves all entity states for a workspace
func (r *EntityStateRepository) GetAllStateByWorkspace(workspaceID string) (*models.BulkStateResponse, error) {
	caps, err := r.GetCapabilitiesByWorkspace(workspaceID)
	if err != nil {
		return nil, err
	}

	enablers, err := r.GetEnablersByWorkspace(workspaceID)
	if err != nil {
		return nil, err
	}

	cards, err := r.GetStoryCardsByWorkspace(workspaceID)
	if err != nil {
		return nil, err
	}

	return &models.BulkStateResponse{
		Capabilities: caps,
		Enablers:     enablers,
		StoryCards:   cards,
	}, nil
}

// ============================================================================
// AUDIT LOG OPERATIONS
// ============================================================================

// GetStateChangeHistory retrieves the state change history for an entity
func (r *EntityStateRepository) GetStateChangeHistory(entityType, entityID string, limit int) ([]models.EntityStateChange, error) {
	rows, err := r.db.Query(`
		SELECT id, entity_type, entity_id, field_changed, old_value, new_value,
		       change_reason, changed_by, changed_at, workspace_id
		FROM entity_state_changes
		WHERE entity_type = $1 AND entity_id = $2
		ORDER BY changed_at DESC
		LIMIT $3
	`, entityType, entityID, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to query state changes: %w", err)
	}
	defer rows.Close()

	var changes []models.EntityStateChange
	for rows.Next() {
		var change models.EntityStateChange
		err := rows.Scan(
			&change.ID, &change.EntityType, &change.EntityID, &change.FieldChanged,
			&change.OldValue, &change.NewValue, &change.ChangeReason, &change.ChangedBy,
			&change.ChangedAt, &change.WorkspaceID,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan state change: %w", err)
		}
		changes = append(changes, change)
	}

	return changes, nil
}
