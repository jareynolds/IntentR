// IntentR - Copyright 2025 James Reynolds
//
// This file is part of IntentR.
// You may use this file under either:
//   - The AGPLv3 Open Source License, OR
//   - The IntentR Commercial License
// See the LICENSE.AGPL and LICENSE.COMMERCIAL files for details.

package models

import "time"

// AcceptanceCriteria represents a testable acceptance criterion
type AcceptanceCriteria struct {
	ID                int        `json:"id"`
	CriteriaID        string     `json:"criteria_id"`
	EntityType        string     `json:"entity_type"` // 'capability', 'enabler', or 'requirement'
	EntityID          int        `json:"entity_id"`
	Title             string     `json:"title"`
	Description       string     `json:"description"`
	CriteriaFormat    string     `json:"criteria_format"` // 'checklist', 'given_when_then', 'metric'
	GivenClause       *string    `json:"given_clause,omitempty"`
	WhenClause        *string    `json:"when_clause,omitempty"`
	ThenClause        *string    `json:"then_clause,omitempty"`
	MetricName        *string    `json:"metric_name,omitempty"`
	MetricTarget      *string    `json:"metric_target,omitempty"`
	MetricActual      *string    `json:"metric_actual,omitempty"`
	Priority          string     `json:"priority"` // must, should, could, wont
	Status            string     `json:"status"`   // pending, passed, failed, blocked, skipped
	VerifiedBy        *int       `json:"verified_by,omitempty"`
	VerifiedAt        *time.Time `json:"verified_at,omitempty"`
	VerificationNotes *string    `json:"verification_notes,omitempty"`
	CreatedBy         *int       `json:"created_by,omitempty"`
	CreatedAt         time.Time  `json:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at"`
	// Resolved names for display
	VerifierName string `json:"verifier_name,omitempty"`
	EntityName   string `json:"entity_name,omitempty"`
}

// CreateAcceptanceCriteriaRequest represents the request to create new acceptance criteria
type CreateAcceptanceCriteriaRequest struct {
	CriteriaID     string `json:"criteria_id"`
	EntityType     string `json:"entity_type"`
	EntityID       int    `json:"entity_id"`
	Title          string `json:"title"`
	Description    string `json:"description"`
	CriteriaFormat string `json:"criteria_format"`
	GivenClause    string `json:"given_clause,omitempty"`
	WhenClause     string `json:"when_clause,omitempty"`
	ThenClause     string `json:"then_clause,omitempty"`
	MetricName     string `json:"metric_name,omitempty"`
	MetricTarget   string `json:"metric_target,omitempty"`
	Priority       string `json:"priority"`
}

// UpdateAcceptanceCriteriaRequest represents the request to update acceptance criteria
type UpdateAcceptanceCriteriaRequest struct {
	Title             *string `json:"title,omitempty"`
	Description       *string `json:"description,omitempty"`
	CriteriaFormat    *string `json:"criteria_format,omitempty"`
	GivenClause       *string `json:"given_clause,omitempty"`
	WhenClause        *string `json:"when_clause,omitempty"`
	ThenClause        *string `json:"then_clause,omitempty"`
	MetricName        *string `json:"metric_name,omitempty"`
	MetricTarget      *string `json:"metric_target,omitempty"`
	MetricActual      *string `json:"metric_actual,omitempty"`
	Priority          *string `json:"priority,omitempty"`
	Status            *string `json:"status,omitempty"`
	VerificationNotes *string `json:"verification_notes,omitempty"`
}

// VerifyAcceptanceCriteriaRequest represents the request to verify acceptance criteria
type VerifyAcceptanceCriteriaRequest struct {
	Status            string `json:"status"` // passed, failed, blocked, skipped
	MetricActual      string `json:"metric_actual,omitempty"`
	VerificationNotes string `json:"verification_notes,omitempty"`
}

// AcceptanceCriteriaSummary provides a summary of criteria status for an entity
type AcceptanceCriteriaSummary struct {
	EntityType  string `json:"entity_type"`
	EntityID    int    `json:"entity_id"`
	TotalCount  int    `json:"total_count"`
	PassedCount int    `json:"passed_count"`
	FailedCount int    `json:"failed_count"`
	PendingCount int   `json:"pending_count"`
	BlockedCount int   `json:"blocked_count"`
	SkippedCount int   `json:"skipped_count"`
	Percentage   float64 `json:"percentage"` // % of passed criteria
}

// Entity type constants
const (
	EntityTypeCapability  = "capability"
	EntityTypeEnabler     = "enabler"
	EntityTypeRequirement = "requirement"
)

// Criteria format constants
const (
	CriteriaFormatChecklist     = "checklist"
	CriteriaFormatGivenWhenThen = "given_when_then"
	CriteriaFormatMetric        = "metric"
)

// Criteria status constants
const (
	CriteriaStatusPending = "pending"
	CriteriaStatusPassed  = "passed"
	CriteriaStatusFailed  = "failed"
	CriteriaStatusBlocked = "blocked"
	CriteriaStatusSkipped = "skipped"
)

// Criteria priority constants (simplified MoSCoW)
const (
	CriteriaPriorityMust   = "must"
	CriteriaPriorityShould = "should"
	CriteriaPriorityCould  = "could"
	CriteriaPriorityWont   = "wont"
)

// CapabilityAcceptanceCriteriaItem represents a single criterion in the JSONB array on capabilities
type CapabilityAcceptanceCriteriaItem struct {
	ID          string `json:"id"`
	Description string `json:"description"`
	Completed   bool   `json:"completed"`
	Priority    string `json:"priority"` // must, should, could
	Type        string `json:"type"`     // checklist, given_when_then, metric
}

// ValidEntityTypes returns all valid entity types
func ValidEntityTypes() []string {
	return []string{
		EntityTypeCapability,
		EntityTypeEnabler,
		EntityTypeRequirement,
	}
}

// ValidCriteriaFormats returns all valid criteria formats
func ValidCriteriaFormats() []string {
	return []string{
		CriteriaFormatChecklist,
		CriteriaFormatGivenWhenThen,
		CriteriaFormatMetric,
	}
}

// ValidCriteriaStatuses returns all valid criteria statuses
func ValidCriteriaStatuses() []string {
	return []string{
		CriteriaStatusPending,
		CriteriaStatusPassed,
		CriteriaStatusFailed,
		CriteriaStatusBlocked,
		CriteriaStatusSkipped,
	}
}
