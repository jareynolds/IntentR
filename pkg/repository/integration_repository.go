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
	"time"

	"github.com/jareynolds/ubecode/pkg/models"
)

// IntegrationRepository handles database operations for integrations
type IntegrationRepository struct {
	db *sql.DB
}

// NewIntegrationRepository creates a new integration repository
func NewIntegrationRepository(db *sql.DB) *IntegrationRepository {
	return &IntegrationRepository{db: db}
}

// GetIntegration retrieves an integration by user ID and integration name
func (r *IntegrationRepository) GetIntegration(userID int, integrationName string) (*models.IntegrationWithFields, error) {
	// Get the integration
	var integration models.Integration
	err := r.db.QueryRow(`
		SELECT id, user_id, integration_name, provider_url, configured_at, updated_at, is_active
		FROM integrations
		WHERE user_id = $1 AND integration_name = $2 AND is_active = true
	`, userID, integrationName).Scan(
		&integration.ID,
		&integration.UserID,
		&integration.IntegrationName,
		&integration.ProviderURL,
		&integration.ConfiguredAt,
		&integration.UpdatedAt,
		&integration.IsActive,
	)

	if err == sql.ErrNoRows {
		return nil, nil // Not found, return nil without error
	}
	if err != nil {
		return nil, err
	}

	// Get the fields
	rows, err := r.db.Query(`
		SELECT field_name, field_value
		FROM integration_fields
		WHERE integration_id = $1
	`, integration.ID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	fields := make(map[string]string)
	for rows.Next() {
		var name, value string
		if err := rows.Scan(&name, &value); err != nil {
			return nil, err
		}
		fields[name] = value
	}

	return &models.IntegrationWithFields{
		Integration: integration,
		Fields:      fields,
	}, nil
}

// SaveIntegration creates or updates an integration
func (r *IntegrationRepository) SaveIntegration(userID int, integrationName, providerURL string, fields map[string]string) error {
	tx, err := r.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Upsert integration
	var integrationID int
	err = tx.QueryRow(`
		INSERT INTO integrations (user_id, integration_name, provider_url, updated_at)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (user_id, integration_name)
		DO UPDATE SET provider_url = $3, updated_at = $4, is_active = true
		RETURNING id
	`, userID, integrationName, providerURL, time.Now()).Scan(&integrationID)
	if err != nil {
		return err
	}

	// Delete existing fields
	_, err = tx.Exec(`DELETE FROM integration_fields WHERE integration_id = $1`, integrationID)
	if err != nil {
		return err
	}

	// Insert new fields
	for name, value := range fields {
		_, err = tx.Exec(`
			INSERT INTO integration_fields (integration_id, field_name, field_value, updated_at)
			VALUES ($1, $2, $3, $4)
		`, integrationID, name, value, time.Now())
		if err != nil {
			return err
		}
	}

	return tx.Commit()
}

// GetAnalysisCache retrieves cached analysis for a provider URL
func (r *IntegrationRepository) GetAnalysisCache(providerURL string) (string, error) {
	var analysisData string
	var expiresAt time.Time

	err := r.db.QueryRow(`
		SELECT analysis_data, expires_at
		FROM integration_analysis_cache
		WHERE provider_url = $1
	`, providerURL).Scan(&analysisData, &expiresAt)

	if err == sql.ErrNoRows {
		return "", nil // Not found
	}
	if err != nil {
		return "", err
	}

	// Check if expired
	if time.Now().After(expiresAt) {
		// Delete expired cache
		r.db.Exec(`DELETE FROM integration_analysis_cache WHERE provider_url = $1`, providerURL)
		return "", nil
	}

	return analysisData, nil
}

// SaveAnalysisCache saves analysis results to cache
func (r *IntegrationRepository) SaveAnalysisCache(providerURL, integrationName string, analysis interface{}) error {
	analysisJSON, err := json.Marshal(analysis)
	if err != nil {
		return err
	}

	// Cache expires after 30 days
	expiresAt := time.Now().Add(30 * 24 * time.Hour)

	_, err = r.db.Exec(`
		INSERT INTO integration_analysis_cache (provider_url, integration_name, analysis_data, expires_at)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (provider_url)
		DO UPDATE SET analysis_data = $3, analyzed_at = CURRENT_TIMESTAMP, expires_at = $4
	`, providerURL, integrationName, string(analysisJSON), expiresAt)

	return err
}
