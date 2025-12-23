// IntentR — Copyright © 2025 James Reynolds
//
// This file is part of IntentR.
// You may use this file under either:
//   • The AGPLv3 Open Source License, OR
//   • The IntentR Commercial License
// See the LICENSE.AGPL and LICENSE.COMMERCIAL files for details.

package models

// File represents a Figma file
type File struct {
	Key          string    `json:"key"`
	Name         string    `json:"name"`
	LastModified string    `json:"lastModified"`
	ThumbnailURL string    `json:"thumbnailUrl"`
	Version      string    `json:"version"`
	Document     *Document `json:"document,omitempty"`
}

// Document represents the document structure in Figma
type Document struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Type     string `json:"type"`
	Children []Node `json:"children,omitempty"`
}

// Node represents a node in the Figma document tree
type Node struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Type     string `json:"type"`
	Children []Node `json:"children,omitempty"`
}

// Comment represents a comment in Figma
type Comment struct {
	ID         string `json:"id"`
	Message    string `json:"message"`
	ClientMeta string `json:"client_meta"`
	CreatedAt  string `json:"created_at"`
	UserID     string `json:"user_id"`
}
