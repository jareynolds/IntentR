// IntentR — Copyright © 2025 James Reynolds
//
// This file is part of IntentR.
// You may use this file under either:
//   • The AGPLv3 Open Source License, OR
//   • The IntentR Commercial License
// See the LICENSE.AGPL and LICENSE.COMMERCIAL files for details.

package client

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/jareynolds/ubecode/pkg/models"
)

const (
	baseURL = "https://api.figma.com/v1"
)

// FigmaClient handles communication with the Figma API
type FigmaClient struct {
	baseURL    string
	httpClient *http.Client
	token      string
}

// NewFigmaClient creates a new Figma API client
func NewFigmaClient(token string) *FigmaClient {
	return &FigmaClient{
		baseURL: baseURL,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
		token: token,
	}
}

// GetFile retrieves a Figma file by its key
func (c *FigmaClient) GetFile(ctx context.Context, fileKey string) (*models.File, error) {
	url := fmt.Sprintf("%s/files/%s", c.baseURL, fileKey)

	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("X-Figma-Token", c.token)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("API request failed with status %d: %s", resp.StatusCode, string(body))
	}

	var file models.File
	if err := json.NewDecoder(resp.Body).Decode(&file); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &file, nil
}

// GetComments retrieves comments for a Figma file
func (c *FigmaClient) GetComments(ctx context.Context, fileKey string) ([]models.Comment, error) {
	url := fmt.Sprintf("%s/files/%s/comments", c.baseURL, fileKey)

	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("X-Figma-Token", c.token)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("API request failed with status %d: %s", resp.StatusCode, string(body))
	}

	var response struct {
		Comments []models.Comment `json:"comments"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return response.Comments, nil
}
