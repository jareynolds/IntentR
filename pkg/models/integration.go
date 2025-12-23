// IntentR — Copyright © 2025 James Reynolds
//
// This file is part of IntentR.
// You may use this file under either:
//   • The AGPLv3 Open Source License, OR
//   • The IntentR Commercial License
// See the LICENSE.AGPL and LICENSE.COMMERCIAL files for details.

package models

import "time"

// Integration represents a user's integration configuration
type Integration struct {
	ID              int       `json:"id" db:"id"`
	UserID          int       `json:"user_id" db:"user_id"`
	IntegrationName string    `json:"integration_name" db:"integration_name"`
	ProviderURL     string    `json:"provider_url" db:"provider_url"`
	ConfiguredAt    time.Time `json:"configured_at" db:"configured_at"`
	UpdatedAt       time.Time `json:"updated_at" db:"updated_at"`
	IsActive        bool      `json:"is_active" db:"is_active"`
}

// IntegrationField represents a configuration field value
type IntegrationField struct {
	ID            int       `json:"id" db:"id"`
	IntegrationID int       `json:"integration_id" db:"integration_id"`
	FieldName     string    `json:"field_name" db:"field_name"`
	FieldValue    string    `json:"field_value" db:"field_value"`
	IsEncrypted   bool      `json:"is_encrypted" db:"is_encrypted"`
	CreatedAt     time.Time `json:"created_at" db:"created_at"`
	UpdatedAt     time.Time `json:"updated_at" db:"updated_at"`
}

// IntegrationAnalysisCache represents cached AI analysis results
type IntegrationAnalysisCache struct {
	ID              int       `json:"id" db:"id"`
	ProviderURL     string    `json:"provider_url" db:"provider_url"`
	IntegrationName string    `json:"integration_name" db:"integration_name"`
	AnalysisData    string    `json:"analysis_data" db:"analysis_data"` // JSONB stored as string
	AnalyzedAt      time.Time `json:"analyzed_at" db:"analyzed_at"`
	ExpiresAt       time.Time `json:"expires_at" db:"expires_at"`
	CreatedAt       time.Time `json:"created_at" db:"created_at"`
}

// IntegrationWithFields combines integration with its field values
type IntegrationWithFields struct {
	Integration
	Fields map[string]string `json:"fields"`
}
