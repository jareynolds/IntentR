// IntentR - Copyright 2025 James Reynolds
//
// This file is part of IntentR.
// You may use this file under either:
//   - The AGPLv3 Open Source License, OR
//   - The IntentR Commercial License
// See the LICENSE.AGPL and LICENSE.COMMERCIAL files for details.

package models

import "time"

// EnablerRequirement represents a functional or non-functional requirement for an enabler
type EnablerRequirement struct {
	ID              int        `json:"id"`
	RequirementID   string     `json:"requirement_id"`
	EnablerID       int        `json:"enabler_id"`
	Name            string     `json:"name"`
	Description     string     `json:"description"`
	RequirementType string     `json:"requirement_type"` // 'functional' or 'non_functional'
	NFRCategory     *string    `json:"nfr_category,omitempty"` // Performance, Security, etc.
	Status          string     `json:"status"`
	ApprovalStatus  string     `json:"approval_status"`
	Priority        string     `json:"priority"` // must_have, should_have, could_have, wont_have
	Completed       bool       `json:"completed"`
	VerifiedBy      *int       `json:"verified_by,omitempty"`
	VerifiedAt      *time.Time `json:"verified_at,omitempty"`
	Notes           *string    `json:"notes,omitempty"`
	CreatedBy       *int       `json:"created_by,omitempty"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
	// Resolved names for display
	VerifierName string `json:"verifier_name,omitempty"`
}

// CreateRequirementRequest represents the request to create a new requirement
type CreateRequirementRequest struct {
	RequirementID   string  `json:"requirement_id"`
	EnablerID       int     `json:"enabler_id"`
	Name            string  `json:"name"`
	Description     string  `json:"description"`
	RequirementType string  `json:"requirement_type"`
	NFRCategory     string  `json:"nfr_category,omitempty"`
	Priority        string  `json:"priority"`
	Notes           string  `json:"notes,omitempty"`
}

// UpdateRequirementRequest represents the request to update a requirement
type UpdateRequirementRequest struct {
	Name            *string `json:"name,omitempty"`
	Description     *string `json:"description,omitempty"`
	RequirementType *string `json:"requirement_type,omitempty"`
	NFRCategory     *string `json:"nfr_category,omitempty"`
	Status          *string `json:"status,omitempty"`
	ApprovalStatus  *string `json:"approval_status,omitempty"`
	Priority        *string `json:"priority,omitempty"`
	Completed       *bool   `json:"completed,omitempty"`
	Notes           *string `json:"notes,omitempty"`
}

// VerifyRequirementRequest represents the request to verify a requirement
type VerifyRequirementRequest struct {
	Completed bool   `json:"completed"`
	Notes     string `json:"notes,omitempty"`
}

// Requirement type constants
const (
	RequirementTypeFunctional    = "functional"
	RequirementTypeNonFunctional = "non_functional"
)

// NFR Category constants
const (
	NFRCategoryPerformance    = "performance"
	NFRCategorySecurity       = "security"
	NFRCategoryUsability      = "usability"
	NFRCategoryScalability    = "scalability"
	NFRCategoryReliability    = "reliability"
	NFRCategoryMaintainability = "maintainability"
	NFRCategoryCompatibility  = "compatibility"
)

// Priority constants (MoSCoW)
const (
	PriorityMustHave   = "must_have"
	PriorityShouldHave = "should_have"
	PriorityCouldHave  = "could_have"
	PriorityWontHave   = "wont_have"
)

// Requirement status constants
const (
	RequirementStatusDraft                  = "draft"
	RequirementStatusReadyForDesign         = "ready_for_design"
	RequirementStatusInDesign               = "in_design"
	RequirementStatusReadyForImplementation = "ready_for_implementation"
	RequirementStatusInImplementation       = "in_implementation"
	RequirementStatusImplemented            = "implemented"
	RequirementStatusVerified               = "verified"
	RequirementStatusRejected               = "rejected"
)

// ValidNFRCategories returns all valid NFR categories
func ValidNFRCategories() []string {
	return []string{
		NFRCategoryPerformance,
		NFRCategorySecurity,
		NFRCategoryUsability,
		NFRCategoryScalability,
		NFRCategoryReliability,
		NFRCategoryMaintainability,
		NFRCategoryCompatibility,
	}
}

// ValidPriorities returns all valid priorities (MoSCoW)
func ValidPriorities() []string {
	return []string{
		PriorityMustHave,
		PriorityShouldHave,
		PriorityCouldHave,
		PriorityWontHave,
	}
}
