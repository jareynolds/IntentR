// IntentR — Copyright © 2025 James Reynolds
//
// This file is part of IntentR.
// You may use this file under either:
//   • The AGPLv3 Open Source License, OR
//   • The IntentR Commercial License
// See the LICENSE.AGPL and LICENSE.COMMERCIAL files for details.

package integration

import (
	"context"

	"github.com/jareynolds/intentr/pkg/client"
	"github.com/jareynolds/intentr/pkg/models"
)

// Service handles integration operations
type Service struct {
	figmaClient *client.FigmaClient
}

// NewService creates a new integration service
func NewService(figmaToken string) *Service {
	return &Service{
		figmaClient: client.NewFigmaClient(figmaToken),
	}
}

// GetFigmaFile retrieves a Figma file
func (s *Service) GetFigmaFile(ctx context.Context, fileKey string) (*models.File, error) {
	return s.figmaClient.GetFile(ctx, fileKey)
}

// GetFigmaComments retrieves comments for a Figma file
func (s *Service) GetFigmaComments(ctx context.Context, fileKey string) ([]models.Comment, error) {
	return s.figmaClient.GetComments(ctx, fileKey)
}
