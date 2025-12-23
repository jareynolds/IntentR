// IntentR — Copyright © 2025 James Reynolds
//
// This file is part of IntentR.
// You may use this file under either:
//   • The AGPLv3 Open Source License, OR
//   • The IntentR Commercial License
// See the LICENSE.AGPL and LICENSE.COMMERCIAL files for details.

package integration

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

// AnthropicClient handles communication with Anthropic API
type AnthropicClient struct {
	apiKey     string
	httpClient *http.Client
}

// NewAnthropicClient creates a new Anthropic API client
func NewAnthropicClient(apiKey string) *AnthropicClient {
	return &AnthropicClient{
		apiKey:     apiKey,
		httpClient: &http.Client{},
	}
}

// IntegrationAnalysis represents the AI analysis result
type IntegrationAnalysis struct {
	IntegrationName string                   `json:"integration_name"`
	Description     string                   `json:"description"`
	AuthMethod      string                   `json:"auth_method"`
	RequiredFields  []ConfigField            `json:"required_fields"`
	OptionalFields  []ConfigField            `json:"optional_fields"`
	Capabilities    []string                 `json:"capabilities"`
	SampleEndpoints map[string]string        `json:"sample_endpoints"`
}

// ConfigField represents a configuration field
type ConfigField struct {
	Name        string `json:"name"`
	Type        string `json:"type"`
	Description string `json:"description"`
	Example     string `json:"example,omitempty"`
	Required    bool   `json:"required"`
}

// AnalyzeIntegrationAPI analyzes an integration API using Claude
func (ac *AnthropicClient) AnalyzeIntegrationAPI(ctx context.Context, providerURL string, providerName string) (*IntegrationAnalysis, error) {
	// First, fetch the API documentation
	apiDoc, err := ac.fetchAPIDocumentation(ctx, providerURL)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch API documentation: %w", err)
	}

	// Prepare the prompt for Claude
	prompt := fmt.Sprintf(`You are an API integration analyst. Analyze the following API documentation for %s and provide a structured analysis.

API Documentation:
%s

Please analyze this API and provide a JSON response with the following structure:
{
  "integration_name": "Name of the integration",
  "description": "Brief description of what this integration does",
  "auth_method": "Authentication method (e.g., 'API Key', 'OAuth 2.0', 'Bearer Token')",
  "required_fields": [
    {
      "name": "field_name",
      "type": "string|number|boolean|array",
      "description": "What this field is for",
      "example": "example value",
      "required": true
    }
  ],
  "optional_fields": [similar structure],
  "capabilities": ["List of things this integration can do"],
  "sample_endpoints": {
    "endpoint_name": "endpoint_url"
  }
}

Focus on practical configuration needs. For authentication, identify what credentials are needed. For capabilities, list what data can be retrieved or actions can be performed.`, providerName, apiDoc)

	// Call Claude API
	analysis, err := ac.callClaudeAPI(ctx, prompt, providerName)
	if err != nil {
		return nil, fmt.Errorf("failed to call Claude API: %w", err)
	}

	return analysis, nil
}

// fetchAPIDocumentation fetches the API documentation from the provider URL
func (ac *AnthropicClient) fetchAPIDocumentation(ctx context.Context, url string) (string, error) {
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return "", err
	}

	resp, err := ac.httpClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("API documentation request failed with status %d", resp.StatusCode)
	}

	// Read response body (limit to 100KB to avoid memory issues)
	limitedReader := io.LimitReader(resp.Body, 100*1024)
	body, err := io.ReadAll(limitedReader)
	if err != nil {
		return "", err
	}

	return string(body), nil
}

// ClaudeRequest represents a request to the Anthropic API
type ClaudeRequest struct {
	Model     string          `json:"model"`
	MaxTokens int             `json:"max_tokens"`
	Messages  []ClaudeMessage `json:"messages"`
}

// ClaudeMessage represents a message in the conversation
type ClaudeMessage struct {
	Role    string      `json:"role"`
	Content interface{} `json:"content"` // Can be string or []ContentBlock for multimodal
}

// ContentBlock represents a content block in a multimodal message
type ContentBlock struct {
	Type   string       `json:"type"`
	Text   string       `json:"text,omitempty"`
	Source *ImageSource `json:"source,omitempty"`
}

// ImageSource represents the source of an image
type ImageSource struct {
	Type      string `json:"type"`
	MediaType string `json:"media_type"`
	Data      string `json:"data"`
}

// ClaudeResponse represents the response from Anthropic API
type ClaudeResponse struct {
	ID      string `json:"id"`
	Content []struct {
		Type string `json:"type"`
		Text string `json:"text"`
	} `json:"content"`
}

// callClaudeAPI makes a request to the Anthropic Claude API
func (ac *AnthropicClient) callClaudeAPI(ctx context.Context, prompt string, providerName string) (*IntegrationAnalysis, error) {
	reqBody := ClaudeRequest{
		Model:     "claude-3-haiku-20240307",
		MaxTokens: 4096,
		Messages: []ClaudeMessage{
			{
				Role:    "user",
				Content: prompt,
			},
		},
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, "POST", "https://api.anthropic.com/v1/messages", bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", ac.apiKey)
	req.Header.Set("anthropic-version", "2023-06-01")

	resp, err := ac.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("Claude API request failed with status %d: %s", resp.StatusCode, string(body))
	}

	var claudeResp ClaudeResponse
	if err := json.NewDecoder(resp.Body).Decode(&claudeResp); err != nil {
		return nil, err
	}

	// Extract the JSON from Claude's response
	if len(claudeResp.Content) == 0 {
		return nil, fmt.Errorf("no content in Claude response")
	}

	responseText := claudeResp.Content[0].Text

	// Try to extract JSON from markdown first (Claude often wraps responses)
	extractedJSON := extractJSONFromMarkdown(responseText)

	// Parse the JSON response
	var analysis IntegrationAnalysis
	if err := json.Unmarshal([]byte(extractedJSON), &analysis); err != nil {
		// Log the response for debugging
		fmt.Printf("DEBUG: Failed to parse Claude response. Raw text (first 500 chars):\n%s\n", responseText[:min(500, len(responseText))])
		fmt.Printf("DEBUG: Extracted JSON (first 500 chars):\n%s\n", extractedJSON[:min(500, len(extractedJSON))])
		return nil, fmt.Errorf("failed to parse Claude response: %w", err)
	}

	// Post-process: Add team_url field for Figma integration
	if providerName == "Figma API" || providerName == "Figma" {
		// Add team_url as a required field for Figma
		teamURLField := ConfigField{
			Name:        "team_url",
			Type:        "string",
			Description: "Your Figma team URL (e.g., https://www.figma.com/files/team/TEAM_ID/Team-Name). Find this by going to your team's files page in Figma and copying the URL from your browser.",
			Example:     "https://www.figma.com/files/team/1234567890/My-Team",
			Required:    true,
		}

		// Check if team_url already exists (in case AI added it)
		hasTeamURL := false
		for _, field := range analysis.RequiredFields {
			if field.Name == "team_url" {
				hasTeamURL = true
				break
			}
		}

		// Add if not present
		if !hasTeamURL {
			analysis.RequiredFields = append(analysis.RequiredFields, teamURLField)
		}
	}

	return &analysis, nil
}

// SuggestResources uses Claude AI to suggest which resources should be integrated with the workspace
func (ac *AnthropicClient) SuggestResources(ctx context.Context, req SuggestResourcesRequest) (*SuggestResourcesResponse, error) {
	// Convert resources to JSON for the prompt
	resourcesJSON, err := json.MarshalIndent(req.Resources, "  ", "  ")
	if err != nil {
		return nil, err
	}

	prompt := fmt.Sprintf(`You are an integration recommendation assistant. Based on the workspace context and available resources, suggest which resources should be integrated.

Workspace Name: %s
Workspace Description: %s
Integration: %s

Available Resources:
%s

Please analyze these resources and suggest which ones are most relevant for this workspace. Consider:
1. Resource names and descriptions that match the workspace purpose
2. Recently updated resources (more likely to be active)
3. Resources that would provide the most value for collaboration

Provide your response in the following JSON format:
{
  "suggestions": [
    {
      "resource_id": "resource identifier",
      "resource_name": "resource name",
      "reason": "why this resource is relevant",
      "confidence": 0.85
    }
  ],
  "reasoning": "Overall explanation of the suggestions"
}

The confidence should be between 0.0 and 1.0, where 1.0 means highly confident this resource should be integrated.`,
		req.WorkspaceName,
		req.WorkspaceDesc,
		req.IntegrationName,
		string(resourcesJSON))

	// Call Claude API
	reqBody := ClaudeRequest{
		Model:     "claude-3-haiku-20240307",
		MaxTokens: 2048,
		Messages: []ClaudeMessage{
			{
				Role:    "user",
				Content: prompt,
			},
		},
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return nil, err
	}

	httpReq, err := http.NewRequestWithContext(ctx, "POST", "https://api.anthropic.com/v1/messages", bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, err
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("x-api-key", ac.apiKey)
	httpReq.Header.Set("anthropic-version", "2023-06-01")

	resp, err := ac.httpClient.Do(httpReq)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("Claude API request failed with status %d: %s", resp.StatusCode, string(body))
	}

	var claudeResp ClaudeResponse
	if err := json.NewDecoder(resp.Body).Decode(&claudeResp); err != nil {
		return nil, err
	}

	if len(claudeResp.Content) == 0 {
		return nil, fmt.Errorf("no content in Claude response")
	}

	responseText := claudeResp.Content[0].Text

	// Extract JSON from response
	extractedJSON := extractJSONFromMarkdown(responseText)

	var suggestions SuggestResourcesResponse
	if err := json.Unmarshal([]byte(extractedJSON), &suggestions); err != nil {
		fmt.Printf("DEBUG: Failed to parse suggestions. Raw text (first 500 chars):\n%s\n", responseText[:min(500, len(responseText))])
		fmt.Printf("DEBUG: Extracted JSON (first 500 chars):\n%s\n", extractedJSON[:min(500, len(extractedJSON))])
		return nil, fmt.Errorf("failed to parse Claude response: %w", err)
	}

	return &suggestions, nil
}

// min returns the minimum of two integers
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// extractJSONFromMarkdown extracts JSON from markdown code blocks
func extractJSONFromMarkdown(text string) string {
	textBytes := []byte(text)

	// Look for ```json code blocks
	if start := bytes.Index(textBytes, []byte("```json")); start != -1 {
		afterMarker := start + 7 // len("```json")
		// Skip any whitespace/newlines after ```json
		for afterMarker < len(textBytes) && (textBytes[afterMarker] == '\n' || textBytes[afterMarker] == '\t' || textBytes[afterMarker] == ' ') {
			afterMarker++
		}
		// Find closing ```
		if end := bytes.Index(textBytes[afterMarker:], []byte("```")); end != -1 {
			return string(bytes.TrimSpace(textBytes[afterMarker : afterMarker+end]))
		}
	}

	// Look for generic ``` code blocks
	if start := bytes.Index(textBytes, []byte("```")); start != -1 {
		afterMarker := start + 3 // len("```")
		// Skip any whitespace/newlines after ```
		for afterMarker < len(textBytes) && (textBytes[afterMarker] == '\n' || textBytes[afterMarker] == '\t' || textBytes[afterMarker] == ' ') {
			afterMarker++
		}
		// Find closing ```
		if end := bytes.Index(textBytes[afterMarker:], []byte("```")); end != -1 {
			return string(bytes.TrimSpace(textBytes[afterMarker : afterMarker+end]))
		}
	}

	// Look for JSON object starting with { and find matching }
	if start := bytes.Index(textBytes, []byte("{")); start != -1 {
		end := findMatchingBrace(textBytes, start)
		if end != -1 {
			return string(bytes.TrimSpace(textBytes[start : end+1]))
		}
		// Fallback to rest of string if matching brace not found
		return string(bytes.TrimSpace(textBytes[start:]))
	}

	// Return as-is if no markers found
	return string(bytes.TrimSpace(textBytes))
}

// findMatchingBrace finds the index of the closing brace that matches the opening brace at startIdx
func findMatchingBrace(data []byte, startIdx int) int {
	if startIdx >= len(data) || data[startIdx] != '{' {
		return -1
	}

	depth := 0
	inString := false
	escape := false

	for i := startIdx; i < len(data); i++ {
		if escape {
			escape = false
			continue
		}

		switch data[i] {
		case '\\':
			if inString {
				escape = true
			}
		case '"':
			inString = !inString
		case '{':
			if !inString {
				depth++
			}
		case '}':
			if !inString {
				depth--
				if depth == 0 {
					return i
				}
			}
		}
	}

	return -1
}

// SendMessage sends a simple message to Claude and returns the text response
func (ac *AnthropicClient) SendMessage(ctx context.Context, prompt string) (string, error) {
	reqBody := ClaudeRequest{
		Model:     "claude-sonnet-4-20250514",
		MaxTokens: 8192, // Increased for detailed analysis output
		Messages: []ClaudeMessage{
			{
				Role:    "user",
				Content: prompt,
			},
		},
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return "", err
	}

	req, err := http.NewRequestWithContext(ctx, "POST", "https://api.anthropic.com/v1/messages", bytes.NewBuffer(jsonData))
	if err != nil {
		return "", err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", ac.apiKey)
	req.Header.Set("anthropic-version", "2023-06-01")

	resp, err := ac.httpClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("Claude API request failed with status %d: %s", resp.StatusCode, string(body))
	}

	var claudeResp ClaudeResponse
	if err := json.NewDecoder(resp.Body).Decode(&claudeResp); err != nil {
		return "", err
	}

	if len(claudeResp.Content) == 0 {
		return "", fmt.Errorf("no content in Claude response")
	}

	return claudeResp.Content[0].Text, nil
}

// ImageData represents an image to be sent to Claude
type ImageData struct {
	MediaType string // e.g., "image/png", "image/jpeg"
	Data      string // base64 encoded image data
}

// SendMessageWithImages sends a message with images to Claude and returns the text response
func (ac *AnthropicClient) SendMessageWithImages(ctx context.Context, prompt string, images []ImageData) (string, error) {
	var content []ContentBlock

	// Add images first
	for _, img := range images {
		content = append(content, ContentBlock{
			Type: "image",
			Source: &ImageSource{
				Type:      "base64",
				MediaType: img.MediaType,
				Data:      img.Data,
			},
		})
	}

	// Add text prompt
	content = append(content, ContentBlock{
		Type: "text",
		Text: prompt,
	})

	reqBody := ClaudeRequest{
		Model:     "claude-sonnet-4-20250514",
		MaxTokens: 8192,
		Messages: []ClaudeMessage{
			{
				Role:    "user",
				Content: content,
			},
		},
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return "", err
	}

	req, err := http.NewRequestWithContext(ctx, "POST", "https://api.anthropic.com/v1/messages", bytes.NewBuffer(jsonData))
	if err != nil {
		return "", err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", ac.apiKey)
	req.Header.Set("anthropic-version", "2023-06-01")

	resp, err := ac.httpClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("Claude API request failed with status %d: %s", resp.StatusCode, string(body))
	}

	var claudeResp ClaudeResponse
	if err := json.NewDecoder(resp.Body).Decode(&claudeResp); err != nil {
		return "", err
	}

	if len(claudeResp.Content) == 0 {
		return "", fmt.Errorf("no content in Claude response")
	}

	return claudeResp.Content[0].Text, nil
}
