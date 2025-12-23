// IntentR — Copyright © 2025 James Reynolds
//
// This file is part of IntentR.
// You may use this file under either:
//   • The AGPLv3 Open Source License, OR
//   • The IntentR Commercial License
// See the LICENSE.AGPL and LICENSE.COMMERCIAL files for details.

package models

import "time"

// Capability represents a INTENT capability in the system (Scaled Agile With AI)
type Capability struct {
	ID                  int       `json:"id"`
	CapabilityID        string    `json:"capability_id"`
	Name                string    `json:"name"`
	Status              string    `json:"status"`
	Description         string    `json:"description"`
	Purpose             string    `json:"purpose"`
	StoryboardReference string    `json:"storyboard_reference"`
	CreatedAt           time.Time `json:"created_at"`
	UpdatedAt           time.Time `json:"updated_at"`
	CreatedBy           *int      `json:"created_by"`
	IsActive            bool      `json:"is_active"`
	// Approval workflow fields
	WorkflowStage  *string `json:"workflow_stage,omitempty"`
	ApprovalStatus *string `json:"approval_status,omitempty"`
}

// CapabilityDependency represents a dependency relationship between capabilities
type CapabilityDependency struct {
	ID             int       `json:"id"`
	CapabilityID   int       `json:"capability_id"`
	DependsOnID    int       `json:"depends_on_id"`
	DependencyType string    `json:"dependency_type"` // 'upstream' or 'downstream'
	CreatedAt      time.Time `json:"created_at"`
}

// CapabilityAsset represents an asset associated with a capability
type CapabilityAsset struct {
	ID           int       `json:"id"`
	CapabilityID int       `json:"capability_id"`
	AssetType    string    `json:"asset_type"` // 'file' or 'url'
	AssetName    string    `json:"asset_name"`
	AssetURL     string    `json:"asset_url"`
	Description  string    `json:"description"`
	FileSize     *int64    `json:"file_size,omitempty"`
	MimeType     *string   `json:"mime_type,omitempty"`
	CreatedAt    time.Time `json:"created_at"`
	CreatedBy    *int      `json:"created_by"`
}

// CapabilityWithDetails includes the capability and all related data
type CapabilityWithDetails struct {
	Capability
	UpstreamDependencies   []Capability      `json:"upstream_dependencies"`
	DownstreamDependencies []Capability      `json:"downstream_dependencies"`
	Assets                 []CapabilityAsset `json:"assets"`
}

// CreateCapabilityRequest represents the request to create a new capability
type CreateCapabilityRequest struct {
	CapabilityID        string   `json:"capability_id"`
	Name                string   `json:"name"`
	Status              string   `json:"status"`
	Description         string   `json:"description"`
	Purpose             string   `json:"purpose"`
	StoryboardReference string   `json:"storyboard_reference"`
	UpstreamDependencies []int   `json:"upstream_dependencies"`
	DownstreamDependencies []int `json:"downstream_dependencies"`
	Assets              []CreateAssetRequest `json:"assets"`
}

// CreateAssetRequest represents the request to create a capability asset
type CreateAssetRequest struct {
	AssetType   string  `json:"asset_type"`
	AssetName   string  `json:"asset_name"`
	AssetURL    string  `json:"asset_url"`
	Description string  `json:"description"`
	FileSize    *int64  `json:"file_size,omitempty"`
	MimeType    *string `json:"mime_type,omitempty"`
}

// UpdateCapabilityRequest represents the request to update a capability
type UpdateCapabilityRequest struct {
	Name                   *string              `json:"name,omitempty"`
	Status                 *string              `json:"status,omitempty"`
	Description            *string              `json:"description,omitempty"`
	Purpose                *string              `json:"purpose,omitempty"`
	StoryboardReference    *string              `json:"storyboard_reference,omitempty"`
	UpstreamDependencies   *[]int               `json:"upstream_dependencies,omitempty"`
	DownstreamDependencies *[]int               `json:"downstream_dependencies,omitempty"`
	Assets                 *[]CreateAssetRequest `json:"assets,omitempty"`
	IsActive               *bool                `json:"is_active,omitempty"`
}
