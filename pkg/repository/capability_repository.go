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

	"github.com/jareynolds/ubecode/pkg/models"
)

// CapabilityRepository handles database operations for capabilities
type CapabilityRepository struct {
	db *sql.DB
}

// NewCapabilityRepository creates a new capability repository
func NewCapabilityRepository(db *sql.DB) *CapabilityRepository {
	return &CapabilityRepository{db: db}
}

// Create creates a new capability with dependencies and assets
func (r *CapabilityRepository) Create(req models.CreateCapabilityRequest, userID int) (*models.CapabilityWithDetails, error) {
	tx, err := r.db.Begin()
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	// Insert capability
	var capability models.Capability
	err = tx.QueryRow(`
		INSERT INTO capabilities (capability_id, name, status, description, purpose, storyboard_reference, created_by)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, capability_id, name, status, description, purpose, storyboard_reference, created_at, updated_at, created_by, is_active
	`, req.CapabilityID, req.Name, req.Status, req.Description, req.Purpose, req.StoryboardReference, userID).Scan(
		&capability.ID, &capability.CapabilityID, &capability.Name, &capability.Status,
		&capability.Description, &capability.Purpose, &capability.StoryboardReference,
		&capability.CreatedAt, &capability.UpdatedAt, &capability.CreatedBy, &capability.IsActive,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create capability: %w", err)
	}

	// Insert upstream dependencies
	for _, depID := range req.UpstreamDependencies {
		_, err = tx.Exec(`
			INSERT INTO capability_dependencies (capability_id, depends_on_id, dependency_type)
			VALUES ($1, $2, 'upstream')
		`, capability.ID, depID)
		if err != nil {
			return nil, fmt.Errorf("failed to create upstream dependency: %w", err)
		}
	}

	// Insert downstream dependencies
	for _, depID := range req.DownstreamDependencies {
		_, err = tx.Exec(`
			INSERT INTO capability_dependencies (capability_id, depends_on_id, dependency_type)
			VALUES ($1, $2, 'downstream')
		`, capability.ID, depID)
		if err != nil {
			return nil, fmt.Errorf("failed to create downstream dependency: %w", err)
		}
	}

	// Insert assets
	for _, asset := range req.Assets {
		_, err = tx.Exec(`
			INSERT INTO capability_assets (capability_id, asset_type, asset_name, asset_url, description, file_size, mime_type, created_by)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		`, capability.ID, asset.AssetType, asset.AssetName, asset.AssetURL, asset.Description, asset.FileSize, asset.MimeType, userID)
		if err != nil {
			return nil, fmt.Errorf("failed to create asset: %w", err)
		}
	}

	if err = tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	// Fetch the full capability with details
	return r.GetByID(capability.ID)
}

// GetAll retrieves all active capabilities
func (r *CapabilityRepository) GetAll() ([]models.Capability, error) {
	rows, err := r.db.Query(`
		SELECT id, capability_id, name, status, description, purpose, storyboard_reference,
		       created_at, updated_at, created_by, is_active, current_stage, approval_status
		FROM capabilities
		WHERE is_active = true
		ORDER BY created_at DESC
	`)
	if err != nil {
		return nil, fmt.Errorf("failed to query capabilities: %w", err)
	}
	defer rows.Close()

	var capabilities []models.Capability
	for rows.Next() {
		var cap models.Capability
		err := rows.Scan(
			&cap.ID, &cap.CapabilityID, &cap.Name, &cap.Status, &cap.Description,
			&cap.Purpose, &cap.StoryboardReference, &cap.CreatedAt, &cap.UpdatedAt,
			&cap.CreatedBy, &cap.IsActive, &cap.WorkflowStage, &cap.ApprovalStatus,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan capability: %w", err)
		}
		capabilities = append(capabilities, cap)
	}

	return capabilities, nil
}

// GetByID retrieves a capability with all its details
func (r *CapabilityRepository) GetByID(id int) (*models.CapabilityWithDetails, error) {
	var cap models.CapabilityWithDetails

	// Get capability
	err := r.db.QueryRow(`
		SELECT id, capability_id, name, status, description, purpose, storyboard_reference,
		       created_at, updated_at, created_by, is_active, current_stage, approval_status
		FROM capabilities
		WHERE id = $1
	`, id).Scan(
		&cap.ID, &cap.CapabilityID, &cap.Name, &cap.Status, &cap.Description,
		&cap.Purpose, &cap.StoryboardReference, &cap.CreatedAt, &cap.UpdatedAt,
		&cap.CreatedBy, &cap.IsActive, &cap.WorkflowStage, &cap.ApprovalStatus,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get capability: %w", err)
	}

	// Get upstream dependencies
	upstreamRows, err := r.db.Query(`
		SELECT c.id, c.capability_id, c.name, c.status, c.description, c.purpose,
		       c.storyboard_reference, c.created_at, c.updated_at, c.created_by, c.is_active
		FROM capabilities c
		INNER JOIN capability_dependencies cd ON c.id = cd.depends_on_id
		WHERE cd.capability_id = $1 AND cd.dependency_type = 'upstream'
	`, id)
	if err != nil {
		return nil, fmt.Errorf("failed to query upstream dependencies: %w", err)
	}
	defer upstreamRows.Close()

	for upstreamRows.Next() {
		var dep models.Capability
		err := upstreamRows.Scan(
			&dep.ID, &dep.CapabilityID, &dep.Name, &dep.Status, &dep.Description,
			&dep.Purpose, &dep.StoryboardReference, &dep.CreatedAt, &dep.UpdatedAt,
			&dep.CreatedBy, &dep.IsActive,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan upstream dependency: %w", err)
		}
		cap.UpstreamDependencies = append(cap.UpstreamDependencies, dep)
	}

	// Get downstream dependencies
	downstreamRows, err := r.db.Query(`
		SELECT c.id, c.capability_id, c.name, c.status, c.description, c.purpose,
		       c.storyboard_reference, c.created_at, c.updated_at, c.created_by, c.is_active
		FROM capabilities c
		INNER JOIN capability_dependencies cd ON c.id = cd.depends_on_id
		WHERE cd.capability_id = $1 AND cd.dependency_type = 'downstream'
	`, id)
	if err != nil {
		return nil, fmt.Errorf("failed to query downstream dependencies: %w", err)
	}
	defer downstreamRows.Close()

	for downstreamRows.Next() {
		var dep models.Capability
		err := downstreamRows.Scan(
			&dep.ID, &dep.CapabilityID, &dep.Name, &dep.Status, &dep.Description,
			&dep.Purpose, &dep.StoryboardReference, &dep.CreatedAt, &dep.UpdatedAt,
			&dep.CreatedBy, &dep.IsActive,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan downstream dependency: %w", err)
		}
		cap.DownstreamDependencies = append(cap.DownstreamDependencies, dep)
	}

	// Get assets
	assetRows, err := r.db.Query(`
		SELECT id, capability_id, asset_type, asset_name, asset_url, description,
		       file_size, mime_type, created_at, created_by
		FROM capability_assets
		WHERE capability_id = $1
		ORDER BY created_at DESC
	`, id)
	if err != nil {
		return nil, fmt.Errorf("failed to query assets: %w", err)
	}
	defer assetRows.Close()

	for assetRows.Next() {
		var asset models.CapabilityAsset
		err := assetRows.Scan(
			&asset.ID, &asset.CapabilityID, &asset.AssetType, &asset.AssetName,
			&asset.AssetURL, &asset.Description, &asset.FileSize, &asset.MimeType,
			&asset.CreatedAt, &asset.CreatedBy,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan asset: %w", err)
		}
		cap.Assets = append(cap.Assets, asset)
	}

	return &cap, nil
}

// Update updates a capability
func (r *CapabilityRepository) Update(id int, req models.UpdateCapabilityRequest) (*models.CapabilityWithDetails, error) {
	tx, err := r.db.Begin()
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	// Build dynamic update query
	query := "UPDATE capabilities SET "
	args := []interface{}{}
	argPos := 1

	if req.Name != nil {
		query += fmt.Sprintf("name = $%d, ", argPos)
		args = append(args, *req.Name)
		argPos++
	}
	if req.Status != nil {
		query += fmt.Sprintf("status = $%d, ", argPos)
		args = append(args, *req.Status)
		argPos++
	}
	if req.Description != nil {
		query += fmt.Sprintf("description = $%d, ", argPos)
		args = append(args, *req.Description)
		argPos++
	}
	if req.Purpose != nil {
		query += fmt.Sprintf("purpose = $%d, ", argPos)
		args = append(args, *req.Purpose)
		argPos++
	}
	if req.StoryboardReference != nil {
		query += fmt.Sprintf("storyboard_reference = $%d, ", argPos)
		args = append(args, *req.StoryboardReference)
		argPos++
	}
	if req.IsActive != nil {
		query += fmt.Sprintf("is_active = $%d, ", argPos)
		args = append(args, *req.IsActive)
		argPos++
	}

	query += fmt.Sprintf("updated_at = CURRENT_TIMESTAMP WHERE id = $%d", argPos)
	args = append(args, id)

	_, err = tx.Exec(query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to update capability: %w", err)
	}

	// Update upstream dependencies if provided
	if req.UpstreamDependencies != nil {
		_, err = tx.Exec("DELETE FROM capability_dependencies WHERE capability_id = $1 AND dependency_type = 'upstream'", id)
		if err != nil {
			return nil, fmt.Errorf("failed to delete upstream dependencies: %w", err)
		}

		for _, depID := range *req.UpstreamDependencies {
			_, err = tx.Exec(`
				INSERT INTO capability_dependencies (capability_id, depends_on_id, dependency_type)
				VALUES ($1, $2, 'upstream')
			`, id, depID)
			if err != nil {
				return nil, fmt.Errorf("failed to create upstream dependency: %w", err)
			}
		}
	}

	// Update downstream dependencies if provided
	if req.DownstreamDependencies != nil {
		_, err = tx.Exec("DELETE FROM capability_dependencies WHERE capability_id = $1 AND dependency_type = 'downstream'", id)
		if err != nil {
			return nil, fmt.Errorf("failed to delete downstream dependencies: %w", err)
		}

		for _, depID := range *req.DownstreamDependencies {
			_, err = tx.Exec(`
				INSERT INTO capability_dependencies (capability_id, depends_on_id, dependency_type)
				VALUES ($1, $2, 'downstream')
			`, id, depID)
			if err != nil {
				return nil, fmt.Errorf("failed to create downstream dependency: %w", err)
			}
		}
	}

	// Update assets if provided
	if req.Assets != nil {
		_, err = tx.Exec("DELETE FROM capability_assets WHERE capability_id = $1", id)
		if err != nil {
			return nil, fmt.Errorf("failed to delete assets: %w", err)
		}

		for _, asset := range *req.Assets {
			_, err = tx.Exec(`
				INSERT INTO capability_assets (capability_id, asset_type, asset_name, asset_url, description, file_size, mime_type)
				VALUES ($1, $2, $3, $4, $5, $6, $7)
			`, id, asset.AssetType, asset.AssetName, asset.AssetURL, asset.Description, asset.FileSize, asset.MimeType)
			if err != nil {
				return nil, fmt.Errorf("failed to create asset: %w", err)
			}
		}
	}

	if err = tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	return r.GetByID(id)
}

// Delete soft deletes a capability
func (r *CapabilityRepository) Delete(id int) error {
	_, err := r.db.Exec("UPDATE capabilities SET is_active = false WHERE id = $1", id)
	if err != nil {
		return fmt.Errorf("failed to delete capability: %w", err)
	}
	return nil
}
