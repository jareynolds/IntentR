// IntentR — Copyright © 2025 James Reynolds
//
// This file is part of IntentR.
// You may use this file under either:
//   • The AGPLv3 Open Source License, OR
//   • The IntentR Commercial License
// See the LICENSE.AGPL and LICENSE.COMMERCIAL files for details.

package integration

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"
)

// Handler handles HTTP requests for the integration service
type Handler struct {
	service *Service
}

// NewHandler creates a new handler
func NewHandler(service *Service) *Handler {
	return &Handler{
		service: service,
	}
}

// HandleGetFile handles GET /figma/files/{fileKey}
func (h *Handler) HandleGetFile(w http.ResponseWriter, r *http.Request) {
	fileKey := r.PathValue("fileKey")
	if fileKey == "" {
		http.Error(w, "file key is required", http.StatusBadRequest)
		return
	}

	file, err := h.service.GetFigmaFile(r.Context(), fileKey)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(file)
}

// HandleGetComments handles GET /figma/files/{fileKey}/comments
func (h *Handler) HandleGetComments(w http.ResponseWriter, r *http.Request) {
	fileKey := r.PathValue("fileKey")
	if fileKey == "" {
		http.Error(w, "file key is required", http.StatusBadRequest)
		return
	}

	comments, err := h.service.GetFigmaComments(r.Context(), fileKey)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(comments)
}

// HandleHealth handles GET /health
func (h *Handler) HandleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status": "healthy",
	})
}

// AnalyzeIntegrationRequest represents the request body for analyzing an integration
type AnalyzeIntegrationRequest struct {
	ProviderURL  string `json:"provider_url"`
	ProviderName string `json:"provider_name"`
	AnthropicKey string `json:"anthropic_key"`
}

// HandleAnalyzeIntegration handles POST /analyze-integration
func (h *Handler) HandleAnalyzeIntegration(w http.ResponseWriter, r *http.Request) {
	var req AnalyzeIntegrationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.ProviderURL == "" {
		http.Error(w, "provider_url is required", http.StatusBadRequest)
		return
	}

	if req.ProviderName == "" {
		http.Error(w, "provider_name is required", http.StatusBadRequest)
		return
	}

	if req.AnthropicKey == "" {
		http.Error(w, "anthropic_key is required", http.StatusBadRequest)
		return
	}

	// Create Anthropic client with the provided API key
	client := NewAnthropicClient(req.AnthropicKey)

	// Analyze the integration
	analysis, err := client.AnalyzeIntegrationAPI(r.Context(), req.ProviderURL, req.ProviderName)
	if err != nil {
		http.Error(w, fmt.Sprintf("failed to analyze integration: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(analysis)
}

// TestConnectionRequest represents the request body for testing a connection
type TestConnectionRequest struct {
	BaseURL     string            `json:"base_url"`
	Credentials map[string]string `json:"credentials"`
}

// TestConnectionResponse represents the response from a connection test
type TestConnectionResponse struct {
	Success         bool              `json:"success"`
	StatusCode      int               `json:"status_code,omitempty"`
	ErrorMessage    string            `json:"error_message,omitempty"`
	ResponseHeaders map[string]string `json:"response_headers,omitempty"`
	ResponseBody    string            `json:"response_body,omitempty"`
}

// HandleTestConnection handles POST /test-connection
func (h *Handler) HandleTestConnection(w http.ResponseWriter, r *http.Request) {
	var req TestConnectionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.BaseURL == "" {
		http.Error(w, "base_url is required", http.StatusBadRequest)
		return
	}

	// Create HTTP client with timeout
	client := &http.Client{
		Timeout: 30 * time.Second,
	}

	// Create request to test the URL
	testReq, err := http.NewRequestWithContext(r.Context(), "GET", req.BaseURL, nil)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(TestConnectionResponse{
			Success:      false,
			ErrorMessage: fmt.Sprintf("Invalid URL: %v", err),
		})
		return
	}

	// Add credentials as headers if provided
	for key, value := range req.Credentials {
		// Map common credential field names to headers
		switch strings.ToLower(key) {
		case "api_key", "apikey", "api-key":
			testReq.Header.Set("Authorization", "Bearer "+value)
			testReq.Header.Set("X-API-Key", value)
		case "bearer_token", "token", "access_token":
			testReq.Header.Set("Authorization", "Bearer "+value)
		case "username":
			// Will be combined with password for Basic Auth
			if pwd, ok := req.Credentials["password"]; ok {
				auth := base64.StdEncoding.EncodeToString([]byte(value + ":" + pwd))
				testReq.Header.Set("Authorization", "Basic "+auth)
			}
		default:
			// For custom headers, add them directly
			if strings.HasPrefix(strings.ToLower(key), "header_") {
				headerName := strings.TrimPrefix(key, "header_")
				testReq.Header.Set(headerName, value)
			}
		}
	}

	// Set common headers
	testReq.Header.Set("User-Agent", "IntentR-Integration-Test/1.0")
	testReq.Header.Set("Accept", "application/json")

	// Make the request
	resp, err := client.Do(testReq)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(TestConnectionResponse{
			Success:      false,
			ErrorMessage: fmt.Sprintf("Connection failed: %v", err),
		})
		return
	}
	defer resp.Body.Close()

	// Read response body (limited to 10KB for safety)
	bodyBytes, _ := io.ReadAll(io.LimitReader(resp.Body, 10240))
	bodyStr := string(bodyBytes)

	// Extract response headers
	respHeaders := make(map[string]string)
	for key, values := range resp.Header {
		if len(values) > 0 {
			respHeaders[key] = values[0]
		}
	}

	// Determine if successful (2xx status codes)
	success := resp.StatusCode >= 200 && resp.StatusCode < 300

	response := TestConnectionResponse{
		Success:         success,
		StatusCode:      resp.StatusCode,
		ResponseHeaders: respHeaders,
		ResponseBody:    bodyStr,
	}

	if !success {
		response.ErrorMessage = fmt.Sprintf("HTTP %d: %s", resp.StatusCode, http.StatusText(resp.StatusCode))
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// AnalyzeConnectionErrorRequest represents the request for analyzing connection errors
type AnalyzeConnectionErrorRequest struct {
	BaseURL          string                 `json:"base_url"`
	IntegrationName  string                 `json:"integration_name"`
	ConnectionResult map[string]interface{} `json:"connection_result"`
	CurrentFields    []map[string]interface{} `json:"current_fields"`
	CurrentValues    map[string]string      `json:"current_values"`
	AnthropicKey     string                 `json:"anthropic_key"`
}

// AnalyzeConnectionErrorResponse represents the AI analysis of connection errors
type AnalyzeConnectionErrorResponse struct {
	Analysis        string                   `json:"analysis"`
	AuthType        string                   `json:"auth_type"`
	Description     string                   `json:"description"`
	SuggestedFields []map[string]interface{} `json:"suggested_fields"`
}

// HandleAnalyzeConnectionError handles POST /analyze-connection-error
func (h *Handler) HandleAnalyzeConnectionError(w http.ResponseWriter, r *http.Request) {
	var req AnalyzeConnectionErrorRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.BaseURL == "" {
		http.Error(w, "base_url is required", http.StatusBadRequest)
		return
	}

	if req.AnthropicKey == "" {
		http.Error(w, "anthropic_key is required", http.StatusBadRequest)
		return
	}

	// Create Anthropic client
	client := NewAnthropicClient(req.AnthropicKey)

	// Build the prompt for analyzing the connection error
	currentFieldsJSON, _ := json.MarshalIndent(req.CurrentFields, "", "  ")
	connectionResultJSON, _ := json.MarshalIndent(req.ConnectionResult, "", "  ")

	prompt := fmt.Sprintf(`You are an API integration expert. Analyze this failed API connection attempt and determine what authentication or configuration is needed.

API Base URL: %s
Integration Name: %s

Connection Result:
%s

Current Fields Already Configured:
%s

Current Values Provided:
%v

Based on the error response, HTTP status code, and response headers/body, determine:
1. What type of authentication this API likely requires (e.g., API Key, OAuth2, Basic Auth, Bearer Token, Custom Headers)
2. What additional fields the user needs to provide
3. A brief description of what this API does (if discernible)

Respond with a JSON object in this exact format:
{
  "analysis": "Brief explanation of what went wrong and what's needed",
  "auth_type": "The authentication type (e.g., 'API Key', 'OAuth2', 'Basic Auth', 'Bearer Token', 'Custom')",
  "description": "Brief description of the API if identifiable",
  "suggested_fields": [
    {
      "name": "field_name",
      "type": "text|password|url|select",
      "label": "Human readable label",
      "description": "Help text for the user",
      "required": true,
      "placeholder": "Example value"
    }
  ]
}

Common patterns to look for:
- 401 Unauthorized: Usually means authentication is required
- 403 Forbidden: May need different permissions or specific headers
- WWW-Authenticate header: Indicates required auth scheme
- API key can go in: Authorization header, X-API-Key header, or query parameter

Only suggest fields that are NOT already in the current fields list.
Return ONLY the JSON object, no other text.`, req.BaseURL, req.IntegrationName, string(connectionResultJSON), string(currentFieldsJSON), req.CurrentValues)

	// Call Claude to analyze
	analysis, err := client.SendMessage(r.Context(), prompt)
	if err != nil {
		http.Error(w, fmt.Sprintf("AI analysis failed: %v", err), http.StatusInternalServerError)
		return
	}

	// Parse the JSON response from Claude
	var response AnalyzeConnectionErrorResponse

	// Clean the response - Claude might include markdown code blocks
	cleanedAnalysis := strings.TrimSpace(analysis)
	if strings.HasPrefix(cleanedAnalysis, "```json") {
		cleanedAnalysis = strings.TrimPrefix(cleanedAnalysis, "```json")
		cleanedAnalysis = strings.TrimSuffix(cleanedAnalysis, "```")
		cleanedAnalysis = strings.TrimSpace(cleanedAnalysis)
	} else if strings.HasPrefix(cleanedAnalysis, "```") {
		cleanedAnalysis = strings.TrimPrefix(cleanedAnalysis, "```")
		cleanedAnalysis = strings.TrimSuffix(cleanedAnalysis, "```")
		cleanedAnalysis = strings.TrimSpace(cleanedAnalysis)
	}

	if err := json.Unmarshal([]byte(cleanedAnalysis), &response); err != nil {
		// If parsing fails, return a basic response with the raw analysis
		response = AnalyzeConnectionErrorResponse{
			Analysis:        analysis,
			AuthType:        "Unknown",
			SuggestedFields: []map[string]interface{}{},
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// HandleFetchResources handles POST /fetch-resources
func (h *Handler) HandleFetchResources(w http.ResponseWriter, r *http.Request) {
	var req FetchResourcesRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.IntegrationName == "" {
		http.Error(w, "integration_name is required", http.StatusBadRequest)
		return
	}

	if len(req.Credentials) == 0 {
		http.Error(w, "credentials are required", http.StatusBadRequest)
		return
	}

	// Fetch resources from the integration
	response, err := FetchResources(r.Context(), req)
	if err != nil {
		http.Error(w, fmt.Sprintf("failed to fetch resources: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// SuggestResourcesRequest represents the request for AI-suggested resources
type SuggestResourcesRequest struct {
	WorkspaceName   string                  `json:"workspace_name"`
	WorkspaceDesc   string                  `json:"workspace_description"`
	IntegrationName string                  `json:"integration_name"`
	Resources       []IntegrationResource   `json:"resources"`
	AnthropicKey    string                  `json:"anthropic_key"`
}

// SuggestResourcesResponse represents AI suggestions for which resources to integrate
type SuggestResourcesResponse struct {
	Suggestions []ResourceSuggestion `json:"suggestions"`
	Reasoning   string              `json:"reasoning"`
}

// ResourceSuggestion represents a suggested resource to integrate
type ResourceSuggestion struct {
	ResourceID  string  `json:"resource_id"`
	ResourceName string `json:"resource_name"`
	Reason      string  `json:"reason"`
	Confidence  float64 `json:"confidence"` // 0.0 to 1.0
}

// HandleSuggestResources handles POST /suggest-resources
func (h *Handler) HandleSuggestResources(w http.ResponseWriter, r *http.Request) {
	var req SuggestResourcesRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.WorkspaceName == "" {
		http.Error(w, "workspace_name is required", http.StatusBadRequest)
		return
	}

	if req.AnthropicKey == "" {
		http.Error(w, "anthropic_key is required", http.StatusBadRequest)
		return
	}

	if len(req.Resources) == 0 {
		http.Error(w, "resources are required", http.StatusBadRequest)
		return
	}

	// Create Anthropic client
	client := NewAnthropicClient(req.AnthropicKey)

	// Generate AI suggestions
	suggestions, err := client.SuggestResources(r.Context(), req)
	if err != nil {
		http.Error(w, fmt.Sprintf("failed to generate suggestions: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(suggestions)
}

// HandleFetchFiles handles POST /fetch-files
func (h *Handler) HandleFetchFiles(w http.ResponseWriter, r *http.Request) {
	var req FetchFilesRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.IntegrationName == "" {
		http.Error(w, "integration_name is required", http.StatusBadRequest)
		return
	}

	if req.ResourceID == "" {
		http.Error(w, "resource_id is required", http.StatusBadRequest)
		return
	}

	if len(req.Credentials) == 0 {
		http.Error(w, "credentials are required", http.StatusBadRequest)
		return
	}

	// Fetch files from the integration resource
	response, err := FetchFiles(r.Context(), req)
	if err != nil {
		http.Error(w, fmt.Sprintf("failed to fetch files: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// HandleFetchFileMeta handles POST /fetch-file-meta
func (h *Handler) HandleFetchFileMeta(w http.ResponseWriter, r *http.Request) {
	var req FetchFileMetaRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.IntegrationName == "" {
		http.Error(w, "integration_name is required", http.StatusBadRequest)
		return
	}

	if req.FileKey == "" {
		http.Error(w, "file_key is required", http.StatusBadRequest)
		return
	}

	if len(req.Credentials) == 0 {
		http.Error(w, "credentials are required", http.StatusBadRequest)
		return
	}

	// Fetch file metadata from the integration
	response, err := FetchFileMeta(r.Context(), req)
	if err != nil {
		http.Error(w, fmt.Sprintf("failed to fetch file metadata: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// SpecificationFile represents a specification markdown file
type SpecificationFile struct {
	Filename string `json:"filename"`
	Content  string `json:"content"`
}

// ListSpecificationsResponse represents the response for listing specifications
type ListSpecificationsResponse struct {
	Files []SpecificationFile `json:"files"`
}

// HandleListSpecifications handles GET /specifications/list
func (h *Handler) HandleListSpecifications(w http.ResponseWriter, r *http.Request) {
	workspace := r.URL.Query().Get("workspace")
	if workspace == "" {
		http.Error(w, "workspace parameter is required", http.StatusBadRequest)
		return
	}

	fmt.Printf("[ListSpecifications] Workspace path received: %s\n", workspace)

	// Construct path to workspace specifications folder
	// Handle both relative and absolute paths
	// If relative (e.g., "workspaces/AI-Builder"), resolve from current working directory
	// If absolute (e.g., "/root/workspaces/Qamera"), use as-is
	var workspacePath string
	if filepath.IsAbs(workspace) {
		workspacePath = filepath.Join(workspace, "specifications")
	} else {
		// Get current working directory (should be project root)
		cwd, err := os.Getwd()
		if err != nil {
			http.Error(w, fmt.Sprintf("failed to get working directory: %v", err), http.StatusInternalServerError)
			return
		}
		workspacePath = filepath.Join(cwd, workspace, "specifications")
	}

	fmt.Printf("[ListSpecifications] Looking for specifications in: %s\n", workspacePath)

	// Check if directory exists
	if _, err := os.Stat(workspacePath); os.IsNotExist(err) {
		fmt.Printf("[ListSpecifications] ERROR: Directory not found: %s\n", workspacePath)
		http.Error(w, fmt.Sprintf("workspace specifications not found: %s", workspacePath), http.StatusNotFound)
		return
	}

	// Read all markdown files from the directory
	files, err := os.ReadDir(workspacePath)
	if err != nil {
		http.Error(w, fmt.Sprintf("failed to read specifications directory: %v", err), http.StatusInternalServerError)
		return
	}

	var specFiles []SpecificationFile
	for _, file := range files {
		if file.IsDir() {
			continue
		}

		// Only process .md files
		filename := file.Name()
		if !strings.HasSuffix(filename, ".md") {
			continue
		}

		// Skip summary files
		if strings.Contains(filename, "SUMMARY") || strings.Contains(filename, "INDEX") {
			continue
		}

		// Prioritize CAP* and ENB* files, but also include other .md files
		upperFilename := strings.ToUpper(filename)
		isCapability := strings.HasPrefix(upperFilename, "CAP")
		isEnabler := strings.HasPrefix(upperFilename, "ENB")
		isStory := strings.HasPrefix(upperFilename, "STORY")
		isState := strings.HasPrefix(upperFilename, "STATE")
		isSeq := strings.HasPrefix(upperFilename, "SEQ")
		isData := strings.HasPrefix(upperFilename, "DATA")
		isClass := strings.HasPrefix(upperFilename, "CLASS")

		// Include CAP, ENB, and other specification files (not diagram files)
		if !isCapability && !isEnabler && !isStory && (isState || isSeq || isData || isClass) {
			continue // Skip diagram export files
		}

		// Read file content
		filePath := filepath.Join(workspacePath, filename)
		content, err := os.ReadFile(filePath)
		if err != nil {
			continue // Skip files we can't read
		}

		specFiles = append(specFiles, SpecificationFile{
			Filename: filename,
			Content:  string(content),
		})
	}

	fmt.Printf("[ListSpecifications] Found %d specification files in %s\n", len(specFiles), workspacePath)

	response := ListSpecificationsResponse{
		Files: specFiles,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// AnalyzeSpecificationsRequest represents the request for analyzing specifications
type AnalyzeSpecificationsRequest struct {
	Files        []SpecificationFile `json:"files"`
	AnthropicKey string              `json:"anthropic_key"`
}

// CapabilitySpec represents a parsed capability
type CapabilitySpec struct {
	ID                   string   `json:"id"`
	Name                 string   `json:"name"`
	Status               string   `json:"status"`
	Type                 string   `json:"type"`
	Enablers             []string `json:"enablers"`
	UpstreamDependencies []string `json:"upstreamDependencies"`
	DownstreamImpacts    []string `json:"downstreamImpacts"`
}

// EnablerSpec represents a parsed enabler
type EnablerSpec struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	CapabilityID string `json:"capabilityId"`
	Status       string `json:"status"`
	Type         string `json:"type"`
}

// AnalyzeSpecificationsResponse represents the parsed specifications
type AnalyzeSpecificationsResponse struct {
	Capabilities []CapabilitySpec `json:"capabilities"`
	Enablers     []EnablerSpec    `json:"enablers"`
}

// HandleAnalyzeSpecifications handles POST /specifications/analyze
func (h *Handler) HandleAnalyzeSpecifications(w http.ResponseWriter, r *http.Request) {
	var req AnalyzeSpecificationsRequest
	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "failed to read request body", http.StatusBadRequest)
		return
	}

	if err := json.Unmarshal(body, &req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if len(req.Files) == 0 {
		http.Error(w, "files are required", http.StatusBadRequest)
		return
	}

	// Note: AnthropicKey is optional now - we parse relationships directly from markdown
	// if req.AnthropicKey == "" {
	// 	http.Error(w, "anthropic_key is required", http.StatusBadRequest)
	// 	return
	// }

	// Parse files to extract capabilities and enablers with their relationships
	var capabilities []CapabilitySpec
	var enablers []EnablerSpec

	for _, file := range req.Files {
		upperFilename := strings.ToUpper(file.Filename)
		lowerFilename := strings.ToLower(file.Filename)

		// Check if capability file
		// Matches: CAP-*.md, *-capability.md, capability*.md, capabilities*.md
		isCapability := strings.HasPrefix(upperFilename, "CAP-") ||
			strings.HasSuffix(lowerFilename, "-capability.md") ||
			strings.HasPrefix(upperFilename, "CAPABILITY") ||
			strings.HasPrefix(upperFilename, "CAPABILITIES")

		// Check if enabler file
		// Matches: ENB-*.md, *-enabler.md, enabler*.md
		isEnabler := strings.HasPrefix(upperFilename, "ENB-") ||
			strings.HasSuffix(lowerFilename, "-enabler.md") ||
			strings.HasPrefix(upperFilename, "ENABLER")

		if isCapability {
			cap := parseCapabilityFromContent(file.Filename, file.Content)
			capabilities = append(capabilities, cap)
			fmt.Printf("[Analyze] Parsed capability from %s: ID=%s, Name=%s\n", file.Filename, cap.ID, cap.Name)
		} else if isEnabler {
			enb := parseEnablerFromContent(file.Filename, file.Content)
			enablers = append(enablers, enb)
			fmt.Printf("[Analyze] Parsed enabler from %s: ID=%s, Name=%s, CapabilityID=%s\n", file.Filename, enb.ID, enb.Name, enb.CapabilityID)
		}
	}

	fmt.Printf("[Analyze] Parsed %d capabilities and %d enablers from files\n", len(capabilities), len(enablers))

	// Build enabler-to-capability relationships
	for i := range enablers {
		if enablers[i].CapabilityID != "" {
			// Add enabler to capability's enablers list
			for j := range capabilities {
				if capabilities[j].ID == enablers[i].CapabilityID {
					capabilities[j].Enablers = append(capabilities[j].Enablers, enablers[i].ID)
				}
			}
		}
	}

	// If we found capabilities/enablers, return them
	if len(capabilities) > 0 || len(enablers) > 0 {
		result := AnalyzeSpecificationsResponse{
			Capabilities: capabilities,
			Enablers:     enablers,
		}

		fmt.Printf("[Analyze] Final result: %d capabilities, %d enablers\n", len(result.Capabilities), len(result.Enablers))

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(result)
		return
	}

	// Fall back to original full AI analysis if no CAP/ENB files found
	// Create Anthropic client
	client := NewAnthropicClient(req.AnthropicKey)

	// Prepare the prompt for Claude
	var filesContent strings.Builder
	filesContent.WriteString("Analyze the following specification files. IMPORTANT: Create a capability entry for EACH file provided.\n\n")
	filesContent.WriteString("Each markdown file represents either a capability, feature, or enabler.\n\n")

	// List all files first
	filesContent.WriteString("FILES TO PROCESS (create one capability/enabler for each):\n")
	for i, file := range req.Files {
		filesContent.WriteString(fmt.Sprintf("%d. %s\n", i+1, file.Filename))
	}
	filesContent.WriteString("\n")

	for _, file := range req.Files {
		filesContent.WriteString(fmt.Sprintf("=== File: %s ===\n", file.Filename))
		filesContent.WriteString(file.Content)
		filesContent.WriteString("\n\n")
	}

	filesContent.WriteString(fmt.Sprintf("\nIMPORTANT: You MUST create exactly %d capabilities/enablers - one for each file listed above.\n\n", len(req.Files)))
	filesContent.WriteString("Please extract and return a JSON object with the following structure:\n")
	filesContent.WriteString(`{
  "capabilities": [
    {
      "id": "CAP-XXXXXX",
      "name": "Capability Name (from file title or first heading)",
      "status": "Implemented/Planned/In Progress/etc",
      "type": "Capability",
      "enablers": ["ENB-XXXXXX", ...],
      "upstreamDependencies": ["CAP-XXXXXX", ...],
      "downstreamImpacts": ["CAP-XXXXXX", ...]
    }
  ],
  "enablers": [
    {
      "id": "ENB-XXXXXX",
      "name": "Enabler Name",
      "capabilityId": "CAP-XXXXXX",
      "status": "Implemented/Planned/etc",
      "type": "Enabler"
    }
  ]
}

Rules:
1. Create ONE entry for EACH file - do not skip any files
2. If a file has "enabler" in the name or content, add it to enablers array
3. Otherwise, add it to capabilities array
4. Extract the name from the first # heading or the filename
5. Extract status from metadata if present, otherwise use "Planned"
6. Look for dependencies and enablers mentioned in the content
7. Generate unique IDs like CAP-001, CAP-002 for capabilities and ENB-001, ENB-002 for enablers

Return ONLY the JSON object, no additional text.`)

	// Call Claude API
	response, err := client.SendMessage(r.Context(), filesContent.String())
	if err != nil {
		http.Error(w, fmt.Sprintf("failed to analyze specifications: %v", err), http.StatusInternalServerError)
		return
	}

	// Parse Claude's response as JSON
	var analysisResult AnalyzeSpecificationsResponse
	if err := json.Unmarshal([]byte(response), &analysisResult); err != nil {
		// If direct parsing fails, try to extract JSON from the response
		jsonStart := strings.Index(response, "{")
		jsonEnd := strings.LastIndex(response, "}")
		if jsonStart != -1 && jsonEnd != -1 && jsonEnd > jsonStart {
			jsonStr := response[jsonStart : jsonEnd+1]
			if err := json.Unmarshal([]byte(jsonStr), &analysisResult); err != nil {
				http.Error(w, fmt.Sprintf("failed to parse Claude response: %v", err), http.StatusInternalServerError)
				return
			}
		} else {
			http.Error(w, fmt.Sprintf("failed to parse Claude response: %v", err), http.StatusInternalServerError)
			return
		}
	}

	// Fallback: Ensure all files are represented as capabilities
	// Build a map of existing capability/enabler names for quick lookup
	existingNames := make(map[string]bool)
	for _, cap := range analysisResult.Capabilities {
		existingNames[strings.ToLower(cap.Name)] = true
	}
	for _, enb := range analysisResult.Enablers {
		existingNames[strings.ToLower(enb.Name)] = true
	}

	// Check each file and add missing ones as capabilities
	for i, file := range req.Files {
		// Extract name from filename (remove extension and convert dashes/underscores to spaces)
		baseName := strings.TrimSuffix(file.Filename, ".md")
		displayName := strings.ReplaceAll(baseName, "-", " ")
		displayName = strings.ReplaceAll(displayName, "_", " ")
		displayName = strings.Title(displayName)

		// Try to extract name from first heading in content
		lines := strings.Split(file.Content, "\n")
		for _, line := range lines {
			if strings.HasPrefix(line, "# ") {
				displayName = strings.TrimPrefix(line, "# ")
				displayName = strings.TrimSpace(displayName)
				break
			}
		}

		// Check if this file is already represented
		if !existingNames[strings.ToLower(displayName)] && !existingNames[strings.ToLower(baseName)] {
			// Add as a capability
			capID := fmt.Sprintf("CAP-%03d", len(analysisResult.Capabilities)+1)

			// Try to extract status from content
			status := "Planned"
			for _, line := range lines {
				lowerLine := strings.ToLower(line)
				if strings.Contains(lowerLine, "status") {
					if strings.Contains(lowerLine, "implemented") || strings.Contains(lowerLine, "complete") {
						status = "Implemented"
					} else if strings.Contains(lowerLine, "progress") {
						status = "In Progress"
					}
					break
				}
			}

			analysisResult.Capabilities = append(analysisResult.Capabilities, CapabilitySpec{
				ID:                   capID,
				Name:                 displayName,
				Status:               status,
				Type:                 "Capability",
				Enablers:             []string{},
				UpstreamDependencies: []string{},
				DownstreamImpacts:    []string{},
			})
			fmt.Printf("[Analyze] Added missing capability from file %d: %s -> %s\n", i+1, file.Filename, displayName)
		}
	}

	fmt.Printf("[Analyze] Final result: %d capabilities, %d enablers from %d files\n",
		len(analysisResult.Capabilities), len(analysisResult.Enablers), len(req.Files))

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(analysisResult)
}

// GenerateDiagramRequest represents the request for generating diagrams
type GenerateDiagramRequest struct {
	Files        []SpecificationFile `json:"files"`
	AnthropicKey string              `json:"anthropic_key"`
	DiagramType  string              `json:"diagram_type"`
	Prompt       string              `json:"prompt"`
}

// GenerateDiagramResponse represents the generated diagram
type GenerateDiagramResponse struct {
	Diagram     string `json:"diagram"`
	DiagramType string `json:"diagram_type"`
}

// HandleGenerateDiagram handles POST /specifications/generate-diagram
func (h *Handler) HandleGenerateDiagram(w http.ResponseWriter, r *http.Request) {
	var req GenerateDiagramRequest
	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "failed to read request body", http.StatusBadRequest)
		return
	}

	if err := json.Unmarshal(body, &req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if len(req.Files) == 0 {
		http.Error(w, "files are required", http.StatusBadRequest)
		return
	}

	if req.AnthropicKey == "" {
		http.Error(w, "anthropic_key is required", http.StatusBadRequest)
		return
	}

	if req.DiagramType == "" {
		http.Error(w, "diagram_type is required", http.StatusBadRequest)
		return
	}

	// Create Anthropic client
	client := NewAnthropicClient(req.AnthropicKey)

	// Prepare the prompt for Claude
	var filesContent strings.Builder
	filesContent.WriteString("Here are the specification files for a software system:\n\n")

	for _, file := range req.Files {
		filesContent.WriteString(fmt.Sprintf("=== File: %s ===\n", file.Filename))
		filesContent.WriteString(file.Content)
		filesContent.WriteString("\n\n")
	}

	filesContent.WriteString("\n")
	filesContent.WriteString(req.Prompt)

	// Call Claude API
	response, err := client.SendMessage(r.Context(), filesContent.String())
	if err != nil {
		http.Error(w, fmt.Sprintf("failed to generate diagram: %v", err), http.StatusInternalServerError)
		return
	}

	// Clean up the response - extract just the Mermaid code
	diagram := response

	// Try to extract Mermaid code block if present
	if strings.Contains(response, "```mermaid") {
		start := strings.Index(response, "```mermaid")
		if start != -1 {
			start += len("```mermaid")
			end := strings.Index(response[start:], "```")
			if end != -1 {
				diagram = strings.TrimSpace(response[start : start+end])
			}
		}
	} else if strings.Contains(response, "```") {
		// Try generic code block
		start := strings.Index(response, "```")
		if start != -1 {
			start += 3
			// Skip language identifier if present
			newlineIdx := strings.Index(response[start:], "\n")
			if newlineIdx != -1 {
				start += newlineIdx + 1
			}
			end := strings.Index(response[start:], "```")
			if end != -1 {
				diagram = strings.TrimSpace(response[start : start+end])
			}
		}
	}

	result := GenerateDiagramResponse{
		Diagram:     diagram,
		DiagramType: req.DiagramType,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

// AnalyzeApplicationRequest represents the request for analyzing an application
type AnalyzeApplicationRequest struct {
	WorkspacePath string `json:"workspacePath"`
	APIKey        string `json:"apiKey"`
	AIPreset      int    `json:"aiPreset"`
	Prompt        string `json:"prompt"`
}

// AnalyzeApplicationResponse represents the response from application analysis
type AnalyzeApplicationResponse struct {
	Response string `json:"response"`
	Error    string `json:"error,omitempty"`
}

// HandleAnalyzeApplication handles POST /analyze-application
func (h *Handler) HandleAnalyzeApplication(w http.ResponseWriter, r *http.Request) {
	var req AnalyzeApplicationRequest
	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "failed to read request body", http.StatusBadRequest)
		return
	}

	if err := json.Unmarshal(body, &req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.WorkspacePath == "" {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(AnalyzeApplicationResponse{Error: "workspacePath is required"})
		return
	}

	if req.APIKey == "" {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(AnalyzeApplicationResponse{Error: "apiKey is required"})
		return
	}

	if req.Prompt == "" {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(AnalyzeApplicationResponse{Error: "prompt is required"})
		return
	}

	// Read specification files from the workspace
	specsPath := filepath.Join(req.WorkspacePath, "specifications")
	assetsPath := filepath.Join(req.WorkspacePath, "assets")
	var specsContent strings.Builder
	specsContent.WriteString("=== Specification Files ===\n\n")

	filepath.Walk(specsPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil // Skip files we can't read
		}
		if !info.IsDir() && strings.HasSuffix(info.Name(), ".md") {
			content, readErr := os.ReadFile(path)
			if readErr == nil {
				specsContent.WriteString(fmt.Sprintf("=== File: %s ===\n", info.Name()))
				specsContent.WriteString(string(content))
				specsContent.WriteString("\n\n")
			}
		}
		return nil
	})

	// Collect images from specifications and assets folders
	var images []ImageData
	imageExtensions := map[string]string{
		".png":  "image/png",
		".jpg":  "image/jpeg",
		".jpeg": "image/jpeg",
		".gif":  "image/gif",
		".webp": "image/webp",
	}

	// Helper function to collect images from a folder
	collectImages := func(folderPath string) {
		filepath.Walk(folderPath, func(path string, info os.FileInfo, err error) error {
			if err != nil {
				return nil
			}
			if info.IsDir() {
				return nil
			}
			ext := strings.ToLower(filepath.Ext(info.Name()))
			if mediaType, ok := imageExtensions[ext]; ok {
				imgData, readErr := os.ReadFile(path)
				if readErr == nil && len(imgData) < 20*1024*1024 { // Max 20MB per image
					images = append(images, ImageData{
						MediaType: mediaType,
						Data:      base64.StdEncoding.EncodeToString(imgData),
					})
				}
			}
			return nil
		})
	}

	// Collect images from both folders
	collectImages(specsPath)
	collectImages(assetsPath)

	// Get workspace name from path
	workspaceName := filepath.Base(req.WorkspacePath)

	// Add format instructions for file creation
	formatInstructions := fmt.Sprintf(`

IMPORTANT: To create files and folders, use these exact XML tags:
- To create a folder: <create_folder>./%s/path/to/folder</create_folder>
- To create a file: <create_file path="./%s/path/to/file.md">file content here</create_file>

The current workspace is "%s". All paths should be relative and include the workspace name.
For example:
- Specifications go in: ./%s/specifications/
- Code goes in: ./%s/code/
- Assets go in: ./%s/assets/

Create all necessary markdown files for capabilities, storyboards, dependencies, etc.
`, workspaceName, workspaceName, workspaceName, workspaceName, workspaceName, workspaceName)

	// Build the full prompt
	fullPrompt := fmt.Sprintf("%s%s\n\n%s", req.Prompt, formatInstructions, specsContent.String())

	// Create Anthropic client and send request
	client := NewAnthropicClient(req.APIKey)
	var response string
	if len(images) > 0 {
		// Use multimodal API with images
		response, err = client.SendMessageWithImages(r.Context(), fullPrompt, images)
	} else {
		// Use text-only API
		response, err = client.SendMessage(r.Context(), fullPrompt)
	}
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(AnalyzeApplicationResponse{Error: fmt.Sprintf("failed to analyze application: %v", err)})
		return
	}

	// Parse and execute file operations from Claude's response
	filesCreated := 0
	foldersCreated := 0

	// Helper to resolve paths - strips ./ and workspace name prefix
	resolvePath := func(path string) string {
		path = strings.TrimSpace(path)
		// Strip ./ prefix
		if strings.HasPrefix(path, "./") {
			path = path[2:]
		}
		// Strip workspace name prefix if present (e.g., "qamera/specifications" -> "specifications")
		if strings.HasPrefix(path, workspaceName+"/") {
			path = path[len(workspaceName)+1:]
		}
		return filepath.Join(req.WorkspacePath, path)
	}

	// Parse <create_folder>path</create_folder> tags
	folderRegex := regexp.MustCompile(`<create_folder>([^<]+)</create_folder>`)
	folderMatches := folderRegex.FindAllStringSubmatch(response, -1)
	for _, match := range folderMatches {
		if len(match) > 1 {
			folderPath := resolvePath(match[1])
			if err := os.MkdirAll(folderPath, 0755); err == nil {
				foldersCreated++
			}
		}
	}

	// Parse <create_file path="...">content</create_file> tags
	fileRegex := regexp.MustCompile(`(?s)<create_file\s+path="([^"]+)">(.*?)</create_file>`)
	fileMatches := fileRegex.FindAllStringSubmatch(response, -1)
	for _, match := range fileMatches {
		if len(match) > 2 {
			filePath := resolvePath(match[1])
			content := match[2]
			// Ensure parent directory exists
			if err := os.MkdirAll(filepath.Dir(filePath), 0755); err == nil {
				if err := os.WriteFile(filePath, []byte(content), 0644); err == nil {
					filesCreated++
				}
			}
		}
	}

	// Add summary to response
	summary := fmt.Sprintf("\n\n--- Analysis Complete ---\nFolders created: %d\nFiles created: %d", foldersCreated, filesCreated)
	response = response + summary

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(AnalyzeApplicationResponse{Response: response})
}

// ExportIdeationRequest represents the request for exporting ideation to markdown
type ExportIdeationRequest struct {
	WorkspacePath string `json:"workspacePath"`
	Cards         []struct {
		ID      string   `json:"id"`
		Name    string   `json:"name"`
		Content string   `json:"content"`
		Tags    []string `json:"tags"`
		Images  []struct {
			ID  string `json:"id"`
			URL string `json:"url"`
		} `json:"images"`
	} `json:"cards"`
	Connections []struct {
		From     string `json:"from"`
		To       string `json:"to"`
		FromName string `json:"fromName"`
		ToName   string `json:"toName"`
	} `json:"connections"`
	Images []struct {
		ID   string   `json:"id"`
		URL  string   `json:"url"`
		Tags []string `json:"tags"`
	} `json:"images"`
}

// ExportIdeationResponse represents the export result
type ExportIdeationResponse struct {
	FilesCreated  int    `json:"filesCreated"`
	AssetsCreated int    `json:"assetsCreated"`
	Error         string `json:"error,omitempty"`
}

// HandleExportIdeation handles POST /export-ideation
func (h *Handler) HandleExportIdeation(w http.ResponseWriter, r *http.Request) {
	var req ExportIdeationRequest
	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "failed to read request body", http.StatusBadRequest)
		return
	}

	if err := json.Unmarshal(body, &req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.WorkspacePath == "" {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(ExportIdeationResponse{Error: "workspacePath is required"})
		return
	}

	// Create specifications and assets directories
	specsPath := filepath.Join(req.WorkspacePath, "specifications")
	assetsPath := filepath.Join(req.WorkspacePath, "assets")

	if err := os.MkdirAll(specsPath, 0755); err != nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(ExportIdeationResponse{Error: fmt.Sprintf("failed to create specifications folder: %v", err)})
		return
	}

	if err := os.MkdirAll(assetsPath, 0755); err != nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(ExportIdeationResponse{Error: fmt.Sprintf("failed to create assets folder: %v", err)})
		return
	}

	filesCreated := 0
	assetsCreated := 0

	// Build dependency map
	dependencyMap := make(map[string][]string) // id -> list of dependent card names
	dependsOnMap := make(map[string][]string)  // id -> list of cards it depends on

	for _, conn := range req.Connections {
		dependencyMap[conn.From] = append(dependencyMap[conn.From], conn.ToName)
		dependsOnMap[conn.To] = append(dependsOnMap[conn.To], conn.FromName)
	}

	// Export each card as a markdown file
	for _, card := range req.Cards {
		// Sanitize filename
		safeName := strings.ReplaceAll(card.Name, " ", "-")
		safeName = strings.ReplaceAll(safeName, "/", "-")
		safeName = strings.ReplaceAll(safeName, "\\", "-")
		filename := fmt.Sprintf("%s.md", safeName)
		filePath := filepath.Join(specsPath, filename)

		// Build markdown content
		var md strings.Builder
		md.WriteString(fmt.Sprintf("# %s\n\n", card.Name))

		// Tags
		if len(card.Tags) > 0 {
			md.WriteString("## Tags\n")
			for _, tag := range card.Tags {
				md.WriteString(fmt.Sprintf("- %s\n", tag))
			}
			md.WriteString("\n")
		}

		// Content
		md.WriteString("## Content\n\n")
		md.WriteString(card.Content)
		md.WriteString("\n\n")

		// Dependencies (what this card leads to)
		if deps, ok := dependencyMap[card.ID]; ok && len(deps) > 0 {
			md.WriteString("## Leads To\n")
			for _, dep := range deps {
				md.WriteString(fmt.Sprintf("- [[%s]]\n", dep))
			}
			md.WriteString("\n")
		}

		// Depends on (what this card depends on)
		if deps, ok := dependsOnMap[card.ID]; ok && len(deps) > 0 {
			md.WriteString("## Depends On\n")
			for _, dep := range deps {
				md.WriteString(fmt.Sprintf("- [[%s]]\n", dep))
			}
			md.WriteString("\n")
		}

		// Images in card
		if len(card.Images) > 0 {
			md.WriteString("## Images\n")
			for _, img := range card.Images {
				imgFilename := fmt.Sprintf("%s-%s.png", safeName, img.ID)
				md.WriteString(fmt.Sprintf("![%s](../assets/%s)\n", img.ID, imgFilename))
			}
			md.WriteString("\n")
		}

		// Write markdown file
		if err := os.WriteFile(filePath, []byte(md.String()), 0644); err != nil {
			continue
		}
		filesCreated++
	}

	// Export standalone images
	for _, img := range req.Images {
		// Create a markdown for the image
		safeName := fmt.Sprintf("Image-%s", img.ID)
		filename := fmt.Sprintf("%s.md", safeName)
		filePath := filepath.Join(specsPath, filename)

		var md strings.Builder
		md.WriteString(fmt.Sprintf("# %s\n\n", safeName))

		if len(img.Tags) > 0 {
			md.WriteString("## Tags\n")
			for _, tag := range img.Tags {
				md.WriteString(fmt.Sprintf("- %s\n", tag))
			}
			md.WriteString("\n")
		}

		md.WriteString("## Image\n")
		imgFilename := fmt.Sprintf("%s.png", safeName)
		md.WriteString(fmt.Sprintf("![%s](../assets/%s)\n", safeName, imgFilename))

		// Dependencies
		if deps, ok := dependencyMap[img.ID]; ok && len(deps) > 0 {
			md.WriteString("\n## Leads To\n")
			for _, dep := range deps {
				md.WriteString(fmt.Sprintf("- [[%s]]\n", dep))
			}
		}

		if deps, ok := dependsOnMap[img.ID]; ok && len(deps) > 0 {
			md.WriteString("\n## Depends On\n")
			for _, dep := range deps {
				md.WriteString(fmt.Sprintf("- [[%s]]\n", dep))
			}
		}

		if err := os.WriteFile(filePath, []byte(md.String()), 0644); err != nil {
			continue
		}
		filesCreated++
		assetsCreated++ // Count as asset placeholder
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(ExportIdeationResponse{
		FilesCreated:  filesCreated,
		AssetsCreated: assetsCreated,
	})
}

// ListFoldersRequest represents request for listing folders
type ListFoldersRequest struct {
	Path string `json:"path"`
}

// FolderItem represents a folder or file
type FolderItem struct {
	Name  string `json:"name"`
	Path  string `json:"path"`
	IsDir bool   `json:"isDir"`
}

// ListFoldersResponse represents the folder listing response
type ListFoldersResponse struct {
	Items       []FolderItem `json:"items"`
	CurrentPath string       `json:"currentPath"`
	ParentPath  string       `json:"parentPath"`
}

// HandleListFolders handles GET /folders/list
func (h *Handler) HandleListFolders(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Query().Get("path")
	if path == "" {
		path = "workspaces"
	}

	// Ensure path is within workspaces directory for security
	if !strings.HasPrefix(path, "workspaces") {
		http.Error(w, "path must be within workspaces directory", http.StatusBadRequest)
		return
	}

	// Check if directory exists
	if _, err := os.Stat(path); os.IsNotExist(err) {
		http.Error(w, fmt.Sprintf("directory not found: %s", path), http.StatusNotFound)
		return
	}

	// Read directory
	entries, err := os.ReadDir(path)
	if err != nil {
		http.Error(w, fmt.Sprintf("failed to read directory: %v", err), http.StatusInternalServerError)
		return
	}

	var items []FolderItem
	for _, entry := range entries {
		// Skip hidden files
		if strings.HasPrefix(entry.Name(), ".") {
			continue
		}

		items = append(items, FolderItem{
			Name:  entry.Name(),
			Path:  filepath.Join(path, entry.Name()),
			IsDir: entry.IsDir(),
		})
	}

	// Get parent path
	parentPath := filepath.Dir(path)
	if parentPath == "." || !strings.HasPrefix(parentPath, "workspaces") {
		parentPath = ""
	}

	response := ListFoldersResponse{
		Items:       items,
		CurrentPath: path,
		ParentPath:  parentPath,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// CreateFolderRequest represents request for creating a folder
type CreateFolderRequest struct {
	Path string `json:"path"`
	Name string `json:"name"`
}

// HandleCreateFolder handles POST /folders/create
func (h *Handler) HandleCreateFolder(w http.ResponseWriter, r *http.Request) {
	var req CreateFolderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.Path == "" || req.Name == "" {
		http.Error(w, "path and name are required", http.StatusBadRequest)
		return
	}

	// Ensure path is within workspaces directory for security
	if !strings.HasPrefix(req.Path, "workspaces") {
		http.Error(w, "path must be within workspaces directory", http.StatusBadRequest)
		return
	}

	// Create the full folder path
	fullPath := filepath.Join(req.Path, req.Name)

	// Create the folder
	if err := os.MkdirAll(fullPath, 0755); err != nil {
		http.Error(w, fmt.Sprintf("failed to create folder: %v", err), http.StatusInternalServerError)
		return
	}

	// Also create a specifications subfolder
	specsPath := filepath.Join(fullPath, "specifications")
	if err := os.MkdirAll(specsPath, 0755); err != nil {
		http.Error(w, fmt.Sprintf("failed to create specifications folder: %v", err), http.StatusInternalServerError)
		return
	}

	response := FolderItem{
		Name:  req.Name,
		Path:  fullPath,
		IsDir: true,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// EnsureWorkspaceStructureRequest represents request for ensuring workspace folder structure
type EnsureWorkspaceStructureRequest struct {
	Path string `json:"path"`
}

// EnsureWorkspaceStructureResponse represents the response with created folders
type EnsureWorkspaceStructureResponse struct {
	Success        bool     `json:"success"`
	Path           string   `json:"path"`
	CreatedFolders []string `json:"created_folders"`
	ExistingFolders []string `json:"existing_folders"`
}

// HandleEnsureWorkspaceStructure handles POST /folders/ensure-workspace-structure
// Creates all required workspace subfolders if they don't exist
func (h *Handler) HandleEnsureWorkspaceStructure(w http.ResponseWriter, r *http.Request) {
	var req EnsureWorkspaceStructureRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.Path == "" {
		http.Error(w, "path is required", http.StatusBadRequest)
		return
	}

	// Ensure path is within workspaces directory for security
	if !strings.HasPrefix(req.Path, "workspaces") {
		http.Error(w, "path must be within workspaces directory", http.StatusBadRequest)
		return
	}

	// Define the required workspace subfolders
	requiredFolders := []string{
		"conception",
		"definition",
		"design",
		"implementation",
		"assets",
		"code",
		"deploy",
		"scripts",
		"AI_Principles",
		"UI_Design",
		"specifications", // Keep specifications folder as it was already being created
	}

	var createdFolders []string
	var existingFolders []string

	// Ensure the main workspace folder exists
	if err := os.MkdirAll(req.Path, 0755); err != nil {
		http.Error(w, fmt.Sprintf("failed to create workspace folder: %v", err), http.StatusInternalServerError)
		return
	}

	// Create each subfolder if it doesn't exist
	for _, folder := range requiredFolders {
		folderPath := filepath.Join(req.Path, folder)

		// Check if folder exists
		if _, err := os.Stat(folderPath); os.IsNotExist(err) {
			// Create the folder
			if err := os.MkdirAll(folderPath, 0755); err != nil {
				http.Error(w, fmt.Sprintf("failed to create folder %s: %v", folder, err), http.StatusInternalServerError)
				return
			}
			createdFolders = append(createdFolders, folder)
		} else {
			existingFolders = append(existingFolders, folder)
		}
	}

	response := EnsureWorkspaceStructureResponse{
		Success:        true,
		Path:           req.Path,
		CreatedFolders: createdFolders,
		ExistingFolders: existingFolders,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// MoveToDeletedRequest represents request for moving workspace folder to deleted
type MoveToDeletedRequest struct {
	SourcePath string `json:"sourcePath"`
}

// MoveToDeletedResponse represents the response for the move operation
type MoveToDeletedResponse struct {
	Success     bool   `json:"success"`
	SourcePath  string `json:"sourcePath"`
	DestPath    string `json:"destPath"`
	Message     string `json:"message,omitempty"`
}

// HandleMoveToDeleted handles POST /folders/move-to-deleted
// Moves a workspace folder to archived_workspaces instead of permanently deleting
func (h *Handler) HandleMoveToDeleted(w http.ResponseWriter, r *http.Request) {
	var req MoveToDeletedRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.SourcePath == "" {
		http.Error(w, "sourcePath is required", http.StatusBadRequest)
		return
	}

	// Get current working directory
	cwd, err := os.Getwd()
	if err != nil {
		http.Error(w, fmt.Sprintf("failed to get working directory: %v", err), http.StatusInternalServerError)
		return
	}

	// Handle both relative and absolute paths
	sourcePath := req.SourcePath
	if idx := strings.Index(sourcePath, "workspaces/"); idx != -1 {
		sourcePath = sourcePath[idx:]
	}

	// Build full source path
	fullSourcePath := filepath.Join(cwd, sourcePath)

	// Check if source exists
	if _, err := os.Stat(fullSourcePath); os.IsNotExist(err) {
		// Source doesn't exist, nothing to move
		response := MoveToDeletedResponse{
			Success:    true,
			SourcePath: sourcePath,
			Message:    "Source folder does not exist, nothing to move",
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
		return
	}

	// Create archived_workspaces folder if it doesn't exist
	archivedFolder := filepath.Join(cwd, "archived_workspaces")
	if err := os.MkdirAll(archivedFolder, 0755); err != nil {
		http.Error(w, fmt.Sprintf("failed to create archived_workspaces folder: %v", err), http.StatusInternalServerError)
		return
	}

	// Get the folder name from source path
	folderName := filepath.Base(fullSourcePath)

	// Create unique destination name to avoid conflicts (append timestamp if exists)
	destPath := filepath.Join(archivedFolder, folderName)
	if _, err := os.Stat(destPath); !os.IsNotExist(err) {
		// Destination exists, append timestamp
		timestamp := time.Now().Format("20060102-150405")
		destPath = filepath.Join(archivedFolder, fmt.Sprintf("%s-%s", folderName, timestamp))
	}

	// Move the folder
	if err := os.Rename(fullSourcePath, destPath); err != nil {
		http.Error(w, fmt.Sprintf("failed to move folder: %v", err), http.StatusInternalServerError)
		return
	}

	// Build relative dest path for response
	relDestPath := strings.TrimPrefix(destPath, cwd)
	relDestPath = strings.TrimPrefix(relDestPath, string(os.PathSeparator))

	response := MoveToDeletedResponse{
		Success:    true,
		SourcePath: sourcePath,
		DestPath:   relDestPath,
		Message:    "Workspace folder moved to archived_workspaces",
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// InitWorkspaceRequest represents request for initializing workspace with CODE_RULES files
type InitWorkspaceRequest struct {
	WorkspacePath string `json:"workspacePath"`
}

// InitWorkspaceResponse represents the response for workspace initialization
type InitWorkspaceResponse struct {
	Success      bool     `json:"success"`
	FilesCopied  []string `json:"filesCopied"`
	FilesExisted []string `json:"filesExisted"`
	Message      string   `json:"message,omitempty"`
}

// HandleInitWorkspaceFiles handles POST /workspace/init-files
// Copies CLAUDE.md from root to workspace root, and MAIN_SWDEV_PLAN.md from CODE_RULES to workspace/CODE_RULES
func (h *Handler) HandleInitWorkspaceFiles(w http.ResponseWriter, r *http.Request) {
	var req InitWorkspaceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.WorkspacePath == "" {
		http.Error(w, "workspacePath is required", http.StatusBadRequest)
		return
	}

	// Get current working directory
	cwd, err := os.Getwd()
	if err != nil {
		http.Error(w, fmt.Sprintf("failed to get working directory: %v", err), http.StatusInternalServerError)
		return
	}

	// Build workspace path
	workspacePath := filepath.Join(cwd, req.WorkspacePath)
	workspaceCodeRulesPath := filepath.Join(workspacePath, "CODE_RULES")

	// Ensure workspace and CODE_RULES directories exist
	if err := os.MkdirAll(workspaceCodeRulesPath, 0755); err != nil {
		http.Error(w, fmt.Sprintf("failed to create workspace CODE_RULES directory: %v", err), http.StatusInternalServerError)
		return
	}

	var filesCopied []string
	var filesExisted []string

	// File 1: Copy CLAUDE.md from root to workspace root
	claudeSrc := filepath.Join(cwd, "CLAUDE.md")
	claudeDest := filepath.Join(workspacePath, "CLAUDE.md")
	if _, err := os.Stat(claudeDest); os.IsNotExist(err) {
		if _, err := os.Stat(claudeSrc); err == nil {
			content, err := os.ReadFile(claudeSrc)
			if err != nil {
				http.Error(w, fmt.Sprintf("failed to read CLAUDE.md: %v", err), http.StatusInternalServerError)
				return
			}
			if err := os.WriteFile(claudeDest, content, 0644); err != nil {
				http.Error(w, fmt.Sprintf("failed to write CLAUDE.md: %v", err), http.StatusInternalServerError)
				return
			}
			filesCopied = append(filesCopied, "CLAUDE.md")
		}
	} else {
		filesExisted = append(filesExisted, "CLAUDE.md")
	}

	// File 2: Copy MAIN_SWDEV_PLAN.md from CODE_RULES to workspace/CODE_RULES
	planSrc := filepath.Join(cwd, "CODE_RULES", "MAIN_SWDEV_PLAN.md")
	planDest := filepath.Join(workspaceCodeRulesPath, "MAIN_SWDEV_PLAN.md")
	if _, err := os.Stat(planDest); os.IsNotExist(err) {
		if _, err := os.Stat(planSrc); err == nil {
			content, err := os.ReadFile(planSrc)
			if err != nil {
				http.Error(w, fmt.Sprintf("failed to read MAIN_SWDEV_PLAN.md: %v", err), http.StatusInternalServerError)
				return
			}
			if err := os.WriteFile(planDest, content, 0644); err != nil {
				http.Error(w, fmt.Sprintf("failed to write MAIN_SWDEV_PLAN.md: %v", err), http.StatusInternalServerError)
				return
			}
			filesCopied = append(filesCopied, "CODE_RULES/MAIN_SWDEV_PLAN.md")
		}
	} else {
		filesExisted = append(filesExisted, "CODE_RULES/MAIN_SWDEV_PLAN.md")
	}

	response := InitWorkspaceResponse{
		Success:      true,
		FilesCopied:  filesCopied,
		FilesExisted: filesExisted,
		Message:      fmt.Sprintf("Workspace initialized: %d files copied, %d files already existed", len(filesCopied), len(filesExisted)),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// SetActiveAIPrinciplesRequest represents request for setting active AI principles
type SetActiveAIPrinciplesRequest struct {
	WorkspacePath string `json:"workspacePath"`
	PresetLevel   int    `json:"presetLevel"` // 1-5
}

// SetActiveAIPrinciplesResponse represents the response
type SetActiveAIPrinciplesResponse struct {
	Success    bool   `json:"success"`
	PresetFile string `json:"presetFile"`
	Message    string `json:"message,omitempty"`
}

// HandleSetActiveAIPrinciples handles POST /workspace/set-ai-principles
// Copies the selected AI-Policy-Preset(n).md to CODE_RULES/ACTIVE_AI_PRINCIPLES.md in the workspace
func (h *Handler) HandleSetActiveAIPrinciples(w http.ResponseWriter, r *http.Request) {
	var req SetActiveAIPrinciplesRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.WorkspacePath == "" {
		http.Error(w, "workspacePath is required", http.StatusBadRequest)
		return
	}

	if req.PresetLevel < 1 || req.PresetLevel > 5 {
		http.Error(w, "presetLevel must be between 1 and 5", http.StatusBadRequest)
		return
	}

	// Get current working directory
	cwd, err := os.Getwd()
	if err != nil {
		http.Error(w, fmt.Sprintf("failed to get working directory: %v", err), http.StatusInternalServerError)
		return
	}

	// Build paths
	aiPrinciplesPath := filepath.Join(cwd, "AI_Principles")
	workspacePath := filepath.Join(cwd, req.WorkspacePath)
	workspaceCodeRulesPath := filepath.Join(workspacePath, "CODE_RULES")

	presetFileName := fmt.Sprintf("AI-Policy-Preset%d.md", req.PresetLevel)
	srcPath := filepath.Join(aiPrinciplesPath, presetFileName)
	destPath := filepath.Join(workspaceCodeRulesPath, "ACTIVE_AI_PRINCIPLES.md")

	// Check if source file exists
	if _, err := os.Stat(srcPath); os.IsNotExist(err) {
		http.Error(w, fmt.Sprintf("preset file %s not found", presetFileName), http.StatusNotFound)
		return
	}

	// Read source file
	content, err := os.ReadFile(srcPath)
	if err != nil {
		http.Error(w, fmt.Sprintf("failed to read %s: %v", presetFileName, err), http.StatusInternalServerError)
		return
	}

	// Ensure workspace CODE_RULES directory exists
	if err := os.MkdirAll(workspaceCodeRulesPath, 0755); err != nil {
		http.Error(w, fmt.Sprintf("failed to create workspace CODE_RULES directory: %v", err), http.StatusInternalServerError)
		return
	}

	// Write to destination (overwrite if exists)
	if err := os.WriteFile(destPath, content, 0644); err != nil {
		http.Error(w, fmt.Sprintf("failed to write CODE_RULES/ACTIVE_AI_PRINCIPLES.md: %v", err), http.StatusInternalServerError)
		return
	}

	response := SetActiveAIPrinciplesResponse{
		Success:    true,
		PresetFile: presetFileName,
		Message:    fmt.Sprintf("Active AI Principles set to %s in CODE_RULES folder", presetFileName),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// CapabilityFilesRequest represents the request body for fetching capability files
type CapabilityFilesRequest struct {
	WorkspacePath string `json:"workspacePath"`
}

// FileCapability represents a capability parsed from a markdown file
type FileCapability struct {
	Filename     string            `json:"filename"`
	Path         string            `json:"path"`
	Name         string            `json:"name"`
	CapabilityID string            `json:"capabilityId"`
	Description  string            `json:"description"`
	Status       string            `json:"status"`
	Content      string            `json:"content"`
	Fields       map[string]string `json:"fields"`
}

// HandleCapabilityFiles handles POST /capability-files
func (h *Handler) HandleCapabilityFiles(w http.ResponseWriter, r *http.Request) {
	var req CapabilityFilesRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.WorkspacePath == "" {
		http.Error(w, "workspacePath is required", http.StatusBadRequest)
		return
	}

	// Capability files are stored in the definition folder
	// Handle both relative and absolute paths, and Docker volume mounts
	workspacePath := req.WorkspacePath

	// If path contains "workspaces/", extract the relative part
	// This handles absolute host paths when running inside Docker containers
	if idx := strings.Index(workspacePath, "workspaces/"); idx != -1 {
		workspacePath = workspacePath[idx:]
	}

	// Get current working directory
	cwd, err := os.Getwd()
	if err != nil {
		http.Error(w, fmt.Sprintf("failed to get working directory: %v", err), http.StatusInternalServerError)
		return
	}
	specsPath := filepath.Join(cwd, workspacePath, "definition")

	// Check if definition folder exists
	if _, err := os.Stat(specsPath); os.IsNotExist(err) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"capabilities": []FileCapability{},
		})
		return
	}

	// Find capability files matching patterns:
	// - Files starting with: capability*, CAP*, capabilities*
	// - Files containing: -capability (for numeric ID format like 112001-capability.md)
	var capabilities []FileCapability
	prefixPatterns := []string{"capability", "CAP", "capabilities"}
	containsPatterns := []string{"-capability", "-CAPABILITY"}

	err = filepath.Walk(specsPath, func(path string, info os.FileInfo, walkErr error) error {
		if walkErr != nil {
			return nil // Skip errors
		}

		if info.IsDir() {
			return nil
		}

		// Check if file matches any pattern (case-insensitive)
		filename := info.Name()
		filenameUpper := strings.ToUpper(filename)
		matched := false

		// Check prefix patterns (starts with)
		for _, pattern := range prefixPatterns {
			if strings.HasPrefix(filenameUpper, strings.ToUpper(pattern)) {
				matched = true
				break
			}
		}

		// Check contains patterns (for numeric ID format like 112001-capability.md)
		if !matched {
			for _, pattern := range containsPatterns {
				if strings.Contains(filenameUpper, strings.ToUpper(pattern)) {
					matched = true
					break
				}
			}
		}

		if !matched {
			return nil
		}

		// Only process markdown files
		if !strings.HasSuffix(strings.ToLower(filename), ".md") {
			return nil
		}

		// Read file content
		content, err := os.ReadFile(path)
		if err != nil {
			return nil // Skip files we can't read
		}

		// Parse the markdown to extract fields (may return multiple capabilities)
		caps := parseMarkdownCapabilities(filename, path, string(content))

		// If file contains multiple capabilities, split it into separate files
		if len(caps) > 1 {
			if err := splitMultiCapabilityFile(path, caps); err != nil {
				// Log error but continue - we'll still return the parsed capabilities
				fmt.Printf("Warning: failed to split multi-capability file %s: %v\n", path, err)
			}
			// Update paths for the split files
			dir := filepath.Dir(path)
			for i := range caps {
				safeName := strings.ToLower(caps[i].Name)
				safeName = strings.ReplaceAll(safeName, " ", "-")
				safeName = strings.Map(func(r rune) rune {
					if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '-' {
						return r
					}
					return -1
				}, safeName)
				if safeName == "" {
					safeName = fmt.Sprintf("capability-%d", i)
				}
				caps[i].Filename = fmt.Sprintf("CAP-%s.md", safeName)
				caps[i].Path = filepath.Join(dir, caps[i].Filename)
			}
		}

		capabilities = append(capabilities, caps...)

		return nil
	})

	if err != nil {
		http.Error(w, fmt.Sprintf("failed to scan specifications folder: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"capabilities": capabilities,
	})
}

// FileEnabler represents an enabler parsed from a markdown file
type FileEnabler struct {
	Filename     string            `json:"filename"`
	Path         string            `json:"path"`
	Name         string            `json:"name"`
	Purpose      string            `json:"purpose"`
	Status       string            `json:"status"`
	Owner        string            `json:"owner"`
	Priority     string            `json:"priority"`
	CapabilityID string            `json:"capabilityId"`
	EnablerID    string            `json:"enablerId"`
	Fields       map[string]string `json:"fields"`
}

// FileTestScenario represents a test scenario file
type FileTestScenario struct {
	Filename   string            `json:"filename"`
	Path       string            `json:"path"`
	Name       string            `json:"name"`
	ScenarioID string            `json:"scenarioId"`
	EnablerID  string            `json:"enablerId"`
	Status     string            `json:"status"`
	Priority   string            `json:"priority"`
	Fields     map[string]string `json:"fields"`
}

// HandleEnablerFiles handles POST /enabler-files
func (h *Handler) HandleEnablerFiles(w http.ResponseWriter, r *http.Request) {
	var req CapabilityFilesRequest // Reuse the same request struct
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.WorkspacePath == "" {
		http.Error(w, "workspacePath is required", http.StatusBadRequest)
		return
	}

	// Enabler files are stored in the definition folder
	// Handle both relative and absolute paths, and Docker volume mounts
	workspacePath := req.WorkspacePath

	// If path contains "workspaces/", extract the relative part
	if idx := strings.Index(workspacePath, "workspaces/"); idx != -1 {
		workspacePath = workspacePath[idx:]
	}

	// Get current working directory
	cwd, err := os.Getwd()
	if err != nil {
		http.Error(w, fmt.Sprintf("failed to get working directory: %v", err), http.StatusInternalServerError)
		return
	}
	specsPath := filepath.Join(cwd, workspacePath, "definition")

	// Check if definition folder exists
	if _, err := os.Stat(specsPath); os.IsNotExist(err) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"enablers": []FileEnabler{},
		})
		return
	}

	// Find enabler files matching patterns:
	// - Files starting with: ENB-*, enabler*
	// - Files containing: -enabler (for numeric ID format like 112106-enabler.md)
	var enablers []FileEnabler
	prefixPatterns := []string{"ENB-", "enabler"}
	containsPatterns := []string{"-enabler", "-ENABLER"}

	err = filepath.Walk(specsPath, func(path string, info os.FileInfo, walkErr error) error {
		if walkErr != nil {
			return nil // Skip errors
		}

		if info.IsDir() {
			return nil
		}

		// Check if file matches any pattern (case-insensitive)
		filename := info.Name()
		filenameUpper := strings.ToUpper(filename)
		matched := false

		// Check prefix patterns (starts with)
		for _, pattern := range prefixPatterns {
			if strings.HasPrefix(filenameUpper, strings.ToUpper(pattern)) {
				matched = true
				break
			}
		}

		// Check contains patterns (for numeric ID format like 112106-enabler.md)
		if !matched {
			for _, pattern := range containsPatterns {
				if strings.Contains(filenameUpper, strings.ToUpper(pattern)) {
					matched = true
					break
				}
			}
		}

		if !matched {
			return nil
		}

		// Only process markdown files
		if !strings.HasSuffix(strings.ToLower(filename), ".md") {
			return nil
		}

		// Read file content
		content, err := os.ReadFile(path)
		if err != nil {
			return nil // Skip files we can't read
		}

		// Parse the markdown to extract enabler fields
		enabler := parseMarkdownEnabler(filename, path, string(content))
		enablers = append(enablers, enabler)

		return nil
	})

	if err != nil {
		http.Error(w, fmt.Sprintf("failed to scan definition folder: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"enablers": enablers,
	})
}

// HandleTestScenarioFiles handles POST /test-scenario-files
func (h *Handler) HandleTestScenarioFiles(w http.ResponseWriter, r *http.Request) {
	var req CapabilityFilesRequest // Reuse the same request struct
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.WorkspacePath == "" {
		http.Error(w, "workspacePath is required", http.StatusBadRequest)
		return
	}

	// Test scenario files are stored in the test folder
	workspacePath := req.WorkspacePath

	// If path contains "workspaces/", extract the relative part
	if idx := strings.Index(workspacePath, "workspaces/"); idx != -1 {
		workspacePath = workspacePath[idx:]
	}

	// Get current working directory
	cwd, err := os.Getwd()
	if err != nil {
		http.Error(w, fmt.Sprintf("failed to get working directory: %v", err), http.StatusInternalServerError)
		return
	}
	testPath := filepath.Join(cwd, workspacePath, "test")

	// Check if test folder exists
	if _, err := os.Stat(testPath); os.IsNotExist(err) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"testScenarios": []FileTestScenario{},
		})
		return
	}

	// Find test scenario files matching patterns: TS-*, *-test.md
	var testScenarios []FileTestScenario
	prefixPatterns := []string{"TS-", "test"}
	containsPatterns := []string{"-test", "-TEST"}

	err = filepath.Walk(testPath, func(path string, info os.FileInfo, walkErr error) error {
		if walkErr != nil {
			return nil // Skip errors
		}

		if info.IsDir() {
			return nil
		}

		// Check if file matches any pattern (case-insensitive)
		filename := info.Name()
		filenameUpper := strings.ToUpper(filename)
		matched := false

		// Check prefix patterns (starts with)
		for _, pattern := range prefixPatterns {
			if strings.HasPrefix(filenameUpper, strings.ToUpper(pattern)) {
				matched = true
				break
			}
		}

		// Check contains patterns
		if !matched {
			for _, pattern := range containsPatterns {
				if strings.Contains(filenameUpper, strings.ToUpper(pattern)) {
					matched = true
					break
				}
			}
		}

		if !matched {
			return nil
		}

		// Only process markdown files
		if !strings.HasSuffix(strings.ToLower(filename), ".md") {
			return nil
		}

		// Read file content
		content, err := os.ReadFile(path)
		if err != nil {
			return nil // Skip files we can't read
		}

		// Parse the markdown to extract test scenario fields
		scenario := parseMarkdownTestScenario(filename, path, string(content))
		testScenarios = append(testScenarios, scenario)

		return nil
	})

	if err != nil {
		http.Error(w, fmt.Sprintf("failed to scan test folder: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"testScenarios": testScenarios,
	})
}

// parseMarkdownTestScenario parses a markdown file to extract test scenario information
func parseMarkdownTestScenario(filename, path, content string) FileTestScenario {
	scenario := FileTestScenario{
		Filename: filename,
		Path:     path,
		Fields:   make(map[string]string),
	}

	lines := strings.Split(content, "\n")
	for _, line := range lines {
		trimmedLine := strings.TrimSpace(line)

		// Extract title from first # heading
		if strings.HasPrefix(trimmedLine, "# ") && scenario.Name == "" {
			scenario.Name = strings.TrimPrefix(trimmedLine, "# ")
			continue
		}

		// Parse ID field
		if strings.Contains(trimmedLine, "**ID**:") || strings.Contains(trimmedLine, "**Scenario ID**:") {
			idPattern := regexp.MustCompile(`TS-\d+`)
			if match := idPattern.FindString(trimmedLine); match != "" {
				scenario.ScenarioID = match
				scenario.Fields["ID"] = match
			}
			continue
		}

		// Parse Enabler ID field - extract full value after colon (supports both ENB-123456 and ENB-TEXT-NAME-123 formats)
		if strings.Contains(trimmedLine, "**Enabler ID**:") || strings.Contains(trimmedLine, "**Enabler**:") {
			enablerId := trimmedLine
			enablerId = strings.TrimPrefix(enablerId, "- ")
			if idx := strings.Index(enablerId, "**Enabler ID**:"); idx != -1 {
				enablerId = enablerId[idx+len("**Enabler ID**:"):]
			} else if idx := strings.Index(enablerId, "**Enabler**:"); idx != -1 {
				enablerId = enablerId[idx+len("**Enabler**:"):]
			}
			enablerId = strings.TrimSpace(enablerId)
			if enablerId != "" {
				scenario.EnablerID = enablerId
				scenario.Fields["EnablerID"] = enablerId
			}
			continue
		}

		// Parse Status field
		if strings.Contains(trimmedLine, "**Status**:") {
			status := trimmedLine
			status = strings.TrimPrefix(status, "- ")
			if idx := strings.Index(status, "**Status**:"); idx != -1 {
				status = status[idx+len("**Status**:"):]
			}
			scenario.Status = strings.TrimSpace(status)
			scenario.Fields["Status"] = scenario.Status
			continue
		}

		// Parse Priority field
		if strings.Contains(trimmedLine, "**Priority**:") {
			priority := trimmedLine
			priority = strings.TrimPrefix(priority, "- ")
			if idx := strings.Index(priority, "**Priority**:"); idx != -1 {
				priority = priority[idx+len("**Priority**:"):]
			}
			scenario.Priority = strings.TrimSpace(priority)
			scenario.Fields["Priority"] = scenario.Priority
			continue
		}
	}

	// If no ID found, generate from filename
	if scenario.ScenarioID == "" {
		numPattern := regexp.MustCompile(`(\d{4,})`)
		if match := numPattern.FindStringSubmatch(filename); len(match) > 1 {
			scenario.ScenarioID = "TS-" + match[1]
		} else {
			scenario.ScenarioID = fmt.Sprintf("TS-%06d", hashString(filename)%1000000)
		}
	}

	// If no name found, use filename
	if scenario.Name == "" {
		baseName := strings.TrimSuffix(filename, ".md")
		scenario.Name = strings.ReplaceAll(baseName, "-", " ")
		scenario.Name = strings.ReplaceAll(scenario.Name, "_", " ")
	}

	return scenario
}

// parseMarkdownEnabler parses a markdown file to extract enabler information
func parseMarkdownEnabler(filename, path, content string) FileEnabler {
	enabler := FileEnabler{
		Filename: filename,
		Path:     path,
		Fields:   make(map[string]string),
	}

	lines := strings.Split(content, "\n")
	for _, line := range lines {
		trimmedLine := strings.TrimSpace(line)

		// Extract title from first # heading
		if strings.HasPrefix(trimmedLine, "# ") && enabler.Name == "" {
			enabler.Name = strings.TrimPrefix(trimmedLine, "# ")
			continue
		}

		// Parse metadata fields
		// Handle various formats: **Field:** value, - **Field**: value, Field: value
		if strings.HasPrefix(trimmedLine, "**ID**:") || strings.HasPrefix(trimmedLine, "- **ID**:") ||
			strings.HasPrefix(trimmedLine, "**ID:**") || strings.HasPrefix(trimmedLine, "- **ID:**") {
			id := trimmedLine
			id = strings.TrimPrefix(id, "- ")
			id = strings.TrimPrefix(id, "**ID**:")
			id = strings.TrimPrefix(id, "**ID:**")
			enabler.EnablerID = strings.TrimSpace(id)
			enabler.Fields["ID"] = enabler.EnablerID
			continue
		}

		if strings.HasPrefix(trimmedLine, "**Status**:") || strings.HasPrefix(trimmedLine, "- **Status**:") ||
			strings.HasPrefix(trimmedLine, "**Status:**") || strings.HasPrefix(trimmedLine, "- **Status:**") {
			status := trimmedLine
			status = strings.TrimPrefix(status, "- ")
			status = strings.TrimPrefix(status, "**Status**:")
			status = strings.TrimPrefix(status, "**Status:**")
			enabler.Status = strings.TrimSpace(status)
			enabler.Fields["Status"] = enabler.Status
			continue
		}

		if strings.HasPrefix(trimmedLine, "**Owner**:") || strings.HasPrefix(trimmedLine, "- **Owner**:") ||
			strings.HasPrefix(trimmedLine, "**Owner:**") || strings.HasPrefix(trimmedLine, "- **Owner:**") {
			owner := trimmedLine
			owner = strings.TrimPrefix(owner, "- ")
			owner = strings.TrimPrefix(owner, "**Owner**:")
			owner = strings.TrimPrefix(owner, "**Owner:**")
			enabler.Owner = strings.TrimSpace(owner)
			enabler.Fields["Owner"] = enabler.Owner
			continue
		}

		if strings.HasPrefix(trimmedLine, "**Priority**:") || strings.HasPrefix(trimmedLine, "- **Priority**:") ||
			strings.HasPrefix(trimmedLine, "**Priority:**") || strings.HasPrefix(trimmedLine, "- **Priority:**") {
			priority := trimmedLine
			priority = strings.TrimPrefix(priority, "- ")
			priority = strings.TrimPrefix(priority, "**Priority**:")
			priority = strings.TrimPrefix(priority, "**Priority:**")
			enabler.Priority = strings.TrimSpace(priority)
			enabler.Fields["Priority"] = enabler.Priority
			continue
		}

		if strings.HasPrefix(trimmedLine, "**Capability**:") || strings.HasPrefix(trimmedLine, "- **Capability**:") ||
			strings.HasPrefix(trimmedLine, "**Capability:**") || strings.HasPrefix(trimmedLine, "- **Capability:**") {
			cap := trimmedLine
			cap = strings.TrimPrefix(cap, "- ")
			cap = strings.TrimPrefix(cap, "**Capability**:")
			cap = strings.TrimPrefix(cap, "**Capability:**")
			cap = strings.TrimSpace(cap)
			// Extract capability ID from format "Name (CAP-XXXXXX)"
			if idx := strings.LastIndex(cap, "("); idx != -1 {
				capId := strings.TrimSuffix(strings.TrimPrefix(cap[idx:], "("), ")")
				enabler.CapabilityID = strings.TrimSpace(capId)
			} else {
				enabler.CapabilityID = cap
			}
			enabler.Fields["Capability"] = cap
			continue
		}

		// Also parse **Capability ID**: CAP-XXXXXX format
		if strings.HasPrefix(trimmedLine, "**Capability ID**:") || strings.HasPrefix(trimmedLine, "- **Capability ID**:") ||
			strings.HasPrefix(trimmedLine, "**Capability ID:**") || strings.HasPrefix(trimmedLine, "- **Capability ID:**") {
			capId := trimmedLine
			capId = strings.TrimPrefix(capId, "- ")
			capId = strings.TrimPrefix(capId, "**Capability ID**:")
			capId = strings.TrimPrefix(capId, "**Capability ID:**")
			enabler.CapabilityID = strings.TrimSpace(capId)
			enabler.Fields["Capability ID"] = enabler.CapabilityID
			continue
		}

		// NOTE: INTENT State Model fields (lifecycle_state, workflow_stage, stage_status, approval_status)
		// are NOT parsed from markdown. They are stored in the DATABASE only.
	}

	// Extract purpose from ## Purpose section
	purposeIdx := strings.Index(content, "## Purpose")
	if purposeIdx != -1 {
		afterPurpose := content[purposeIdx+len("## Purpose"):]
		nextSectionIdx := strings.Index(afterPurpose, "\n## ")
		if nextSectionIdx == -1 {
			nextSectionIdx = len(afterPurpose)
		}
		enabler.Purpose = strings.TrimSpace(afterPurpose[:nextSectionIdx])
	}

	// Always use filename as source of truth for enabler ID if filename starts with ENB-
	// This handles cases where metadata ID is truncated (e.g., ENB-MANAGE instead of ENB-MANAGE-REACT-COMPONENT-NAVIGATION-FLOW-18)
	if strings.HasPrefix(strings.ToUpper(filename), "ENB-") {
		// Extract full ID from filename by removing .md extension
		fullIdFromFilename := strings.TrimSuffix(filename, ".md")
		enabler.EnablerID = fullIdFromFilename
		enabler.Fields["ID"] = fullIdFromFilename
	}

	return enabler
}

// SaveCapabilityRequest represents the request to save a capability file
type SaveCapabilityRequest struct {
	Path                   string `json:"path"`
	CapabilityID           string `json:"capabilityId"` // Preserve ID in metadata
	Name                   string `json:"name"`
	Description            string `json:"description"`
	Status                 string `json:"status"` // Legacy field for backward compatibility
	Content                string `json:"content"`
	StoryboardReference    string `json:"storyboardReference"`
	// Structured capability fields
	ValueProposition       string `json:"valueProposition"`
	PrimaryPersona         string `json:"primaryPersona"`
	SuccessMetrics         string `json:"successMetrics"`
	AcceptanceCriteria     string `json:"acceptanceCriteria"`
	UserScenarios          string `json:"userScenarios"`
	InScope                string `json:"inScope"`
	OutOfScope             string `json:"outOfScope"`
	UpstreamDependencies   string `json:"upstreamDependencies"`
	DownstreamDependencies string `json:"downstreamDependencies"`
	// INTENT State Model - 4 dimensions
	LifecycleState         string `json:"lifecycle_state"`
	WorkflowStage          string `json:"workflow_stage"`
	StageStatus            string `json:"stage_status"`
	ApprovalStatus         string `json:"approval_status"`
}

// UpdateCapabilityStoryboardRequest represents the request to update a capability's storyboard reference
type UpdateCapabilityStoryboardRequest struct {
	Path               string `json:"path"`
	StoryboardReference string `json:"storyboardReference"`
}

// HandleUpdateCapabilityStoryboard handles POST /update-capability-storyboard
func (h *Handler) HandleUpdateCapabilityStoryboard(w http.ResponseWriter, r *http.Request) {
	var req UpdateCapabilityStoryboardRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.Path == "" {
		http.Error(w, "path is required", http.StatusBadRequest)
		return
	}

	// Translate host path to container path if running in Docker
	filePath := translatePathForDocker(req.Path)

	// Read existing file content
	existingContent, err := os.ReadFile(filePath)
	if err != nil {
		http.Error(w, fmt.Sprintf("failed to read file: %v", err), http.StatusInternalServerError)
		return
	}

	content := string(existingContent)
	lines := strings.Split(content, "\n")
	var newLines []string
	storyboardFieldFound := false
	inMetadata := false

	for i, line := range lines {
		// Check if we're in the metadata section
		if strings.HasPrefix(line, "## Metadata") {
			inMetadata = true
		} else if strings.HasPrefix(line, "## ") && !strings.HasPrefix(line, "## Metadata") {
			// If we're leaving metadata and haven't found storyboard field, add it before this section
			if inMetadata && !storyboardFieldFound {
				newLines = append(newLines, fmt.Sprintf("- **Storyboard Reference**: %s", req.StoryboardReference))
				storyboardFieldFound = true
			}
			inMetadata = false
		}

		// Check for existing Storyboard Reference field
		if strings.Contains(line, "**Storyboard Reference**") || strings.Contains(line, "**Storyboard**:") {
			// Replace the storyboard reference line
			newLines = append(newLines, fmt.Sprintf("- **Storyboard Reference**: %s", req.StoryboardReference))
			storyboardFieldFound = true
		} else {
			newLines = append(newLines, line)
		}

		// If we reach the end of metadata and haven't added the field, add it before the next section
		if inMetadata && i < len(lines)-1 && strings.HasPrefix(lines[i+1], "## ") && !storyboardFieldFound {
			newLines = append(newLines, fmt.Sprintf("- **Storyboard Reference**: %s", req.StoryboardReference))
			storyboardFieldFound = true
		}
	}

	// If we still haven't added the storyboard reference, add it after the Metadata header
	if !storyboardFieldFound {
		// Find metadata section and add after it
		for i, line := range newLines {
			if strings.HasPrefix(line, "## Metadata") {
				// Find the end of metadata items (lines starting with "- **")
				insertIdx := i + 1
				for j := i + 1; j < len(newLines); j++ {
					if strings.HasPrefix(newLines[j], "- **") {
						insertIdx = j + 1
					} else if strings.HasPrefix(newLines[j], "## ") {
						break
					}
				}
				// Insert the storyboard reference
				newContent := append(newLines[:insertIdx], append([]string{fmt.Sprintf("- **Storyboard Reference**: %s", req.StoryboardReference)}, newLines[insertIdx:]...)...)
				newLines = newContent
				storyboardFieldFound = true
				break
			}
		}
	}

	// Write updated content back to file
	newContent := strings.Join(newLines, "\n")
	if err := os.WriteFile(filePath, []byte(newContent), 0644); err != nil {
		http.Error(w, fmt.Sprintf("failed to write file: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":            true,
		"message":            "Capability storyboard reference updated successfully",
		"storyboardReference": req.StoryboardReference,
	})
}

// UpdateEnablerCapabilityRequest represents the request to update an enabler's capability reference
type UpdateEnablerCapabilityRequest struct {
	Path         string `json:"path"`
	CapabilityId string `json:"capabilityId"`
	CapabilityName string `json:"capabilityName"`
}

// HandleUpdateEnablerCapability handles POST /update-enabler-capability
func (h *Handler) HandleUpdateEnablerCapability(w http.ResponseWriter, r *http.Request) {
	var req UpdateEnablerCapabilityRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.Path == "" {
		http.Error(w, "path is required", http.StatusBadRequest)
		return
	}

	// Translate host path to container path if running in Docker
	filePath := translatePathForDocker(req.Path)

	// Read existing file content
	existingContent, err := os.ReadFile(filePath)
	if err != nil {
		http.Error(w, fmt.Sprintf("failed to read file: %v", err), http.StatusInternalServerError)
		return
	}

	content := string(existingContent)
	lines := strings.Split(content, "\n")
	var newLines []string
	capabilityFieldFound := false
	inMetadata := false

	capabilityValue := fmt.Sprintf("%s (%s)", req.CapabilityName, req.CapabilityId)

	for i, line := range lines {
		// Check if we're in the metadata section
		if strings.HasPrefix(line, "## Metadata") {
			inMetadata = true
		} else if strings.HasPrefix(line, "## ") && !strings.HasPrefix(line, "## Metadata") {
			// Exiting metadata section - if we haven't found the field, add it before this line
			if inMetadata && !capabilityFieldFound {
				newLines = append(newLines, fmt.Sprintf("- **Capability**: %s", capabilityValue))
				capabilityFieldFound = true
			}
			inMetadata = false
		}

		// Check for existing Capability field (case-insensitive)
		lineLower := strings.ToLower(line)
		if inMetadata && (strings.HasPrefix(lineLower, "- **capability**:") || strings.HasPrefix(lineLower, "- **capability:**")) {
			// Replace existing Capability field
			newLines = append(newLines, fmt.Sprintf("- **Capability**: %s", capabilityValue))
			capabilityFieldFound = true
			continue
		}

		newLines = append(newLines, line)

		// If we're at the end of the file and still in metadata and haven't added the field
		if i == len(lines)-1 && inMetadata && !capabilityFieldFound {
			newLines = append(newLines, fmt.Sprintf("- **Capability**: %s", capabilityValue))
			capabilityFieldFound = true
		}
	}

	// Write updated content back to file
	newContent := strings.Join(newLines, "\n")
	if err := os.WriteFile(filePath, []byte(newContent), 0644); err != nil {
		http.Error(w, fmt.Sprintf("failed to write file: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":      true,
		"message":      "Enabler capability reference updated successfully",
		"capabilityId": req.CapabilityId,
	})
}

// translatePathForDocker converts host filesystem paths to Docker container paths
// This is needed when running in Docker because the container mounts volumes at different paths
func translatePathForDocker(hostPath string) string {
	// Look for common patterns in the path and translate to container paths
	// Host: /Users/.../Intentr/workspaces/... -> Container: /root/workspaces/...
	// Host: /Users/.../Intentr/AI_Principles/... -> Container: /root/AI_Principles/...
	// Host: /Users/.../Intentr/CODE_RULES/... -> Container: /root/CODE_RULES/...

	pathMappings := []struct {
		hostPattern      string
		containerPrefix  string
	}{
		{"/workspaces/", "/root/workspaces/"},
		{"/AI_Principles/", "/root/AI_Principles/"},
		{"/CODE_RULES/", "/root/CODE_RULES/"},
	}

	for _, mapping := range pathMappings {
		if idx := strings.Index(hostPath, mapping.hostPattern); idx != -1 {
			// Extract the path after the pattern and prepend container prefix
			relativePath := hostPath[idx+len(mapping.hostPattern):]
			translatedPath := mapping.containerPrefix + relativePath
			log.Printf("translatePathForDocker: Translated %s -> %s", hostPath, translatedPath)
			return translatedPath
		}
	}

	// No translation needed - return original path
	return hostPath
}

// HandleSaveCapability handles POST /save-capability
func (h *Handler) HandleSaveCapability(w http.ResponseWriter, r *http.Request) {
	var req SaveCapabilityRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("HandleSaveCapability: Failed to decode request: %v", err)
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	log.Printf("HandleSaveCapability: Saving capability - Path: %s, Name: %s, ID: %s", req.Path, req.Name, req.CapabilityID)

	// Translate host path to container path if running in Docker
	req.Path = translatePathForDocker(req.Path)
	log.Printf("HandleSaveCapability: Using path: %s", req.Path)

	if req.Path == "" {
		log.Printf("HandleSaveCapability: Path is empty")
		http.Error(w, "path is required", http.StatusBadRequest)
		return
	}

	// Build the markdown content following INTENT Capability template
	var content strings.Builder
	content.WriteString(fmt.Sprintf("# %s\n\n", req.Name))

	// Write metadata section
	content.WriteString("## Metadata\n\n")
	if req.CapabilityID != "" {
		content.WriteString(fmt.Sprintf("- **ID**: %s\n", req.CapabilityID))
	}
	content.WriteString(fmt.Sprintf("- **Name**: %s\n", req.Name))
	content.WriteString("- **Type**: Capability\n")
	if req.StoryboardReference != "" {
		content.WriteString(fmt.Sprintf("- **Storyboard Reference**: %s\n", req.StoryboardReference))
	}
	if req.PrimaryPersona != "" {
		content.WriteString(fmt.Sprintf("- **Primary Persona**: %s\n", req.PrimaryPersona))
	}
	content.WriteString("\n")

	// NOTE: State fields (lifecycle_state, workflow_stage, stage_status, approval_status)
	// are stored in the DATABASE only, not in markdown files.
	// The database is the single source of truth for state.

	// Business Context section
	content.WriteString("## Business Context\n\n")
	content.WriteString("### Description\n")
	if req.Description != "" {
		content.WriteString(req.Description + "\n\n")
	} else {
		content.WriteString("_No description provided._\n\n")
	}

	content.WriteString("### Value Proposition\n")
	if req.ValueProposition != "" {
		content.WriteString(req.ValueProposition + "\n\n")
	} else {
		content.WriteString("_Define the value this capability delivers._\n\n")
	}

	content.WriteString("### Success Metrics\n")
	if req.SuccessMetrics != "" {
		// Split by newlines and format as list items
		metrics := strings.Split(strings.TrimSpace(req.SuccessMetrics), "\n")
		for _, metric := range metrics {
			metric = strings.TrimSpace(metric)
			if metric != "" {
				if !strings.HasPrefix(metric, "-") && !strings.HasPrefix(metric, "*") {
					content.WriteString("- " + metric + "\n")
				} else {
					content.WriteString(metric + "\n")
				}
			}
		}
		content.WriteString("\n")
	} else {
		content.WriteString("- _Define success metrics_\n\n")
	}

	// User Perspective section
	content.WriteString("## User Perspective\n\n")
	content.WriteString("### User Scenarios\n")
	if req.UserScenarios != "" {
		content.WriteString(req.UserScenarios + "\n\n")
	} else {
		content.WriteString("_Define user scenarios._\n\n")
	}

	// Boundaries section
	content.WriteString("## Boundaries\n\n")
	content.WriteString("### In Scope\n")
	if req.InScope != "" {
		lines := strings.Split(strings.TrimSpace(req.InScope), "\n")
		for _, line := range lines {
			line = strings.TrimSpace(line)
			if line != "" {
				if !strings.HasPrefix(line, "-") && !strings.HasPrefix(line, "*") {
					content.WriteString("- " + line + "\n")
				} else {
					content.WriteString(line + "\n")
				}
			}
		}
		content.WriteString("\n")
	} else {
		content.WriteString("- _Define what is included_\n\n")
	}

	content.WriteString("### Out of Scope\n")
	if req.OutOfScope != "" {
		lines := strings.Split(strings.TrimSpace(req.OutOfScope), "\n")
		for _, line := range lines {
			line = strings.TrimSpace(line)
			if line != "" {
				if !strings.HasPrefix(line, "-") && !strings.HasPrefix(line, "*") {
					content.WriteString("- " + line + "\n")
				} else {
					content.WriteString(line + "\n")
				}
			}
		}
		content.WriteString("\n")
	} else {
		content.WriteString("- _Define what is excluded_\n\n")
	}

	// Dependencies section
	content.WriteString("## Dependencies\n\n")
	content.WriteString("### Upstream Dependencies\n")
	if req.UpstreamDependencies != "" {
		lines := strings.Split(strings.TrimSpace(req.UpstreamDependencies), "\n")
		for _, line := range lines {
			line = strings.TrimSpace(line)
			if line != "" {
				if !strings.HasPrefix(line, "-") && !strings.HasPrefix(line, "*") {
					content.WriteString("- " + line + "\n")
				} else {
					content.WriteString(line + "\n")
				}
			}
		}
		content.WriteString("\n")
	} else {
		content.WriteString("- _None defined_\n\n")
	}

	content.WriteString("### Downstream Dependencies\n")
	if req.DownstreamDependencies != "" {
		lines := strings.Split(strings.TrimSpace(req.DownstreamDependencies), "\n")
		for _, line := range lines {
			line = strings.TrimSpace(line)
			if line != "" {
				if !strings.HasPrefix(line, "-") && !strings.HasPrefix(line, "*") {
					content.WriteString("- " + line + "\n")
				} else {
					content.WriteString(line + "\n")
				}
			}
		}
		content.WriteString("\n")
	} else {
		content.WriteString("- _None defined_\n\n")
	}

	// Acceptance Criteria section
	content.WriteString("## Acceptance Criteria\n")
	if req.AcceptanceCriteria != "" {
		lines := strings.Split(strings.TrimSpace(req.AcceptanceCriteria), "\n")
		for _, line := range lines {
			line = strings.TrimSpace(line)
			if line != "" {
				if !strings.HasPrefix(line, "-") && !strings.HasPrefix(line, "[") {
					content.WriteString("- [ ] " + line + "\n")
				} else {
					content.WriteString(line + "\n")
				}
			}
		}
		content.WriteString("\n")
	} else {
		content.WriteString("- [ ] _Define acceptance criteria_\n\n")
	}

	// Note: We don't append req.Content here anymore - all structured fields
	// are already written above. Appending req.Content caused duplicate sections.

	// Write to file
	log.Printf("HandleSaveCapability: Writing %d bytes to %s", len(content.String()), req.Path)
	if err := os.WriteFile(req.Path, []byte(content.String()), 0644); err != nil {
		log.Printf("HandleSaveCapability: Failed to write file: %v", err)
		http.Error(w, fmt.Sprintf("failed to save file: %v", err), http.StatusInternalServerError)
		return
	}

	log.Printf("HandleSaveCapability: Successfully saved capability to %s", req.Path)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Capability saved successfully",
	})
}

// DeleteCapabilityRequest represents the request to delete a capability file
type DeleteCapabilityRequest struct {
	Path string `json:"path"`
}

// HandleDeleteCapability handles POST /delete-capability
func (h *Handler) HandleDeleteCapability(w http.ResponseWriter, r *http.Request) {
	var req DeleteCapabilityRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.Path == "" {
		http.Error(w, "path is required", http.StatusBadRequest)
		return
	}

	// Translate host path to container path if running in Docker
	filePath := translatePathForDocker(req.Path)

	// Verify file exists
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		http.Error(w, fmt.Sprintf("file not found: %s", filePath), http.StatusNotFound)
		return
	}

	// Delete the markdown file
	if err := os.Remove(filePath); err != nil {
		http.Error(w, fmt.Sprintf("failed to delete file: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Capability file deleted successfully",
		"path":    filePath,
	})
}

// DeleteEnablerRequest represents the request to delete an enabler file
type DeleteEnablerRequest struct {
	Path string `json:"path"`
}

// HandleDeleteEnabler handles POST /delete-enabler
func (h *Handler) HandleDeleteEnabler(w http.ResponseWriter, r *http.Request) {
	var req DeleteEnablerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.Path == "" {
		http.Error(w, "path is required", http.StatusBadRequest)
		return
	}

	// Translate host path to container path if running in Docker
	filePath := translatePathForDocker(req.Path)

	// Verify file exists
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		http.Error(w, fmt.Sprintf("file not found: %s", filePath), http.StatusNotFound)
		return
	}

	// Delete the markdown file
	if err := os.Remove(filePath); err != nil {
		http.Error(w, fmt.Sprintf("failed to delete file: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Enabler file deleted successfully",
		"path":    filePath,
	})
}

// ReadFileRequest represents the request to read a file
type ReadFileRequest struct {
	WorkspacePath string `json:"workspacePath"`
	FilePath      string `json:"filePath"`
}

// HandleReadFile handles POST /read-file
func (h *Handler) HandleReadFile(w http.ResponseWriter, r *http.Request) {
	var req ReadFileRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	filePath := req.FilePath

	// If filePath is relative or contains workspaces/, resolve it
	if !filepath.IsAbs(filePath) {
		// Try to resolve from workspace path
		if req.WorkspacePath != "" {
			workspacePath := req.WorkspacePath
			if idx := strings.Index(workspacePath, "workspaces/"); idx != -1 {
				relativePath := workspacePath[idx:]
				cwd, err := os.Getwd()
				if err != nil {
					http.Error(w, fmt.Sprintf("failed to get working directory: %v", err), http.StatusInternalServerError)
					return
				}
				workspacePath = filepath.Join(cwd, relativePath)
			}
			filePath = filepath.Join(workspacePath, filePath)
		}
	} else if idx := strings.Index(filePath, "workspaces/"); idx != -1 {
		// Handle path translation for Docker environments
		relativePath := filePath[idx:]
		cwd, err := os.Getwd()
		if err != nil {
			http.Error(w, fmt.Sprintf("failed to get working directory: %v", err), http.StatusInternalServerError)
			return
		}
		filePath = filepath.Join(cwd, relativePath)
	}

	// Read the file
	content, err := os.ReadFile(filePath)
	if err != nil {
		if os.IsNotExist(err) {
			http.Error(w, "file not found", http.StatusNotFound)
		} else {
			http.Error(w, fmt.Sprintf("failed to read file: %v", err), http.StatusInternalServerError)
		}
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"content": string(content),
		"path":    filePath,
	})
}

// SaveTestScenarioRequest represents the request to save a test scenario
type SaveTestScenarioRequest struct {
	WorkspacePath   string   `json:"workspacePath"`
	ScenarioID      string   `json:"scenarioId"`
	ScenarioName    string   `json:"scenarioName"`
	Feature         string   `json:"feature"`
	EnablerID       string   `json:"enablerId"`
	EnablerName     string   `json:"enablerName"`
	RequirementIDs  []string `json:"requirementIds"`
	Priority        string   `json:"priority"`
	Status          string   `json:"status"`
	Automation      string   `json:"automation"`
	Tags            []string `json:"tags"`
	Gherkin         string   `json:"gherkin"`
	LastExecuted    string   `json:"lastExecuted,omitempty"`
	ExecutionTime   float64  `json:"executionTime,omitempty"`
}

// HandleSaveTestScenario handles POST /save-test-scenario
func (h *Handler) HandleSaveTestScenario(w http.ResponseWriter, r *http.Request) {
	var req SaveTestScenarioRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.WorkspacePath == "" {
		http.Error(w, "workspacePath is required", http.StatusBadRequest)
		return
	}

	if req.ScenarioID == "" {
		http.Error(w, "scenarioId is required", http.StatusBadRequest)
		return
	}

	// Handle path translation for Docker environments
	workspacePath := req.WorkspacePath

	// If path contains "workspaces/", extract the relative part and resolve from cwd
	if idx := strings.Index(workspacePath, "workspaces/"); idx != -1 {
		relativePath := workspacePath[idx:]
		cwd, err := os.Getwd()
		if err != nil {
			http.Error(w, fmt.Sprintf("failed to get working directory: %v", err), http.StatusInternalServerError)
			return
		}
		workspacePath = filepath.Join(cwd, relativePath)
	}

	// Create test folder if it doesn't exist
	testFolder := filepath.Join(workspacePath, "test")
	if err := os.MkdirAll(testFolder, 0755); err != nil {
		http.Error(w, fmt.Sprintf("failed to create test folder: %v", err), http.StatusInternalServerError)
		return
	}

	// Generate filename from scenario ID
	filename := fmt.Sprintf("%s.md", req.ScenarioID)
	filePath := filepath.Join(testFolder, filename)

	// Build markdown content
	var content strings.Builder
	content.WriteString(fmt.Sprintf("# %s\n\n", req.ScenarioName))

	// Metadata section
	content.WriteString("## Metadata\n\n")
	content.WriteString(fmt.Sprintf("- **ID**: %s\n", req.ScenarioID))
	content.WriteString(fmt.Sprintf("- **Type**: Test Scenario\n"))
	content.WriteString(fmt.Sprintf("- **Enabler ID**: %s\n", req.EnablerID))
	content.WriteString(fmt.Sprintf("- **Enabler Name**: %s\n", req.EnablerName))
	content.WriteString(fmt.Sprintf("- **Feature**: %s\n", req.Feature))
	content.WriteString(fmt.Sprintf("- **Priority**: %s\n", req.Priority))
	content.WriteString(fmt.Sprintf("- **Status**: %s\n", req.Status))
	content.WriteString(fmt.Sprintf("- **Automation**: %s\n", req.Automation))

	// Requirements
	if len(req.RequirementIDs) > 0 {
		content.WriteString(fmt.Sprintf("- **Requirement IDs**: %s\n", strings.Join(req.RequirementIDs, ", ")))
	}

	// Tags
	if len(req.Tags) > 0 {
		content.WriteString(fmt.Sprintf("- **Tags**: %s\n", strings.Join(req.Tags, ", ")))
	}

	// Execution info
	if req.LastExecuted != "" {
		content.WriteString(fmt.Sprintf("- **Last Executed**: %s\n", req.LastExecuted))
	}
	if req.ExecutionTime > 0 {
		content.WriteString(fmt.Sprintf("- **Execution Time**: %.2fms\n", req.ExecutionTime))
	}

	content.WriteString("\n")

	// Gherkin section
	content.WriteString("## Gherkin Scenario\n\n")
	content.WriteString("```gherkin\n")
	content.WriteString(req.Gherkin)
	content.WriteString("\n```\n")

	// Write the file
	if err := os.WriteFile(filePath, []byte(content.String()), 0644); err != nil {
		http.Error(w, fmt.Sprintf("failed to write test scenario file: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":  true,
		"message":  "Test scenario saved successfully",
		"path":     filePath,
		"filename": filename,
	})
}

// DeleteTestScenarioRequest represents the request to delete a test scenario
type DeleteTestScenarioRequest struct {
	WorkspacePath string `json:"workspacePath"`
	ScenarioID    string `json:"scenarioId"`
}

// HandleDeleteTestScenario handles POST /delete-test-scenario
func (h *Handler) HandleDeleteTestScenario(w http.ResponseWriter, r *http.Request) {
	var req DeleteTestScenarioRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.WorkspacePath == "" {
		http.Error(w, "workspacePath is required", http.StatusBadRequest)
		return
	}

	if req.ScenarioID == "" {
		http.Error(w, "scenarioId is required", http.StatusBadRequest)
		return
	}

	// Handle path translation for Docker environments
	workspacePath := req.WorkspacePath

	// If path contains "workspaces/", extract the relative part and resolve from cwd
	if idx := strings.Index(workspacePath, "workspaces/"); idx != -1 {
		relativePath := workspacePath[idx:]
		cwd, err := os.Getwd()
		if err != nil {
			http.Error(w, fmt.Sprintf("failed to get working directory: %v", err), http.StatusInternalServerError)
			return
		}
		workspacePath = filepath.Join(cwd, relativePath)
	}

	// Build the file path
	testFolder := filepath.Join(workspacePath, "test")
	filename := fmt.Sprintf("%s.md", req.ScenarioID)
	filePath := filepath.Join(testFolder, filename)

	// Verify file exists
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		// File doesn't exist, return success anyway (idempotent delete)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
			"message": "Test scenario file not found (may have been already deleted)",
			"path":    filePath,
		})
		return
	}

	// Delete the markdown file
	if err := os.Remove(filePath); err != nil {
		http.Error(w, fmt.Sprintf("failed to delete file: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Test scenario deleted successfully",
		"path":    filePath,
	})
}

// ListTestScenariosRequest represents the request to list test scenarios
type ListTestScenariosRequest struct {
	WorkspacePath string `json:"workspacePath"`
}

// HandleListTestScenarios handles POST /list-test-scenarios
func (h *Handler) HandleListTestScenarios(w http.ResponseWriter, r *http.Request) {
	var req ListTestScenariosRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.WorkspacePath == "" {
		http.Error(w, "workspacePath is required", http.StatusBadRequest)
		return
	}

	// Handle path translation for Docker environments
	workspacePath := req.WorkspacePath

	// If path contains "workspaces/", extract the relative part and resolve from cwd
	if idx := strings.Index(workspacePath, "workspaces/"); idx != -1 {
		relativePath := workspacePath[idx:]
		cwd, err := os.Getwd()
		if err != nil {
			http.Error(w, fmt.Sprintf("failed to get working directory: %v", err), http.StatusInternalServerError)
			return
		}
		workspacePath = filepath.Join(cwd, relativePath)
	}

	// Build the test folder path
	testFolder := filepath.Join(workspacePath, "test")

	// Check if test folder exists
	if _, err := os.Stat(testFolder); os.IsNotExist(err) {
		// Return empty list if folder doesn't exist
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"scenarios": []interface{}{},
		})
		return
	}

	// Read all .md files from the test folder
	files, err := os.ReadDir(testFolder)
	if err != nil {
		http.Error(w, fmt.Sprintf("failed to read test folder: %v", err), http.StatusInternalServerError)
		return
	}

	var scenarios []map[string]interface{}
	for _, file := range files {
		if file.IsDir() || !strings.HasSuffix(file.Name(), ".md") {
			continue
		}

		filePath := filepath.Join(testFolder, file.Name())
		content, err := os.ReadFile(filePath)
		if err != nil {
			continue // Skip files we can't read
		}

		// Parse the markdown file to extract scenario data
		scenario := parseTestScenarioFromContent(file.Name(), string(content))
		scenario["path"] = filePath
		scenario["filename"] = file.Name()
		scenarios = append(scenarios, scenario)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"scenarios": scenarios,
	})
}

// parseTestScenarioFromContent extracts test scenario information from markdown content
func parseTestScenarioFromContent(filename, content string) map[string]interface{} {
	scenario := make(map[string]interface{})

	// Extract name from first # heading
	lines := strings.Split(content, "\n")
	for _, line := range lines {
		if strings.HasPrefix(line, "# ") {
			scenario["name"] = strings.TrimPrefix(line, "# ")
			scenario["name"] = strings.TrimSpace(scenario["name"].(string))
			break
		}
	}

	// If no heading found, use filename
	if scenario["name"] == nil || scenario["name"] == "" {
		baseName := strings.TrimSuffix(filename, ".md")
		scenario["name"] = baseName
	}

	// Extract metadata fields using regex
	idPattern := regexp.MustCompile(`\*\*ID\*\*:\s*(.+)`)
	enablerIDPattern := regexp.MustCompile(`\*\*Enabler ID\*\*:\s*(.+)`)
	enablerNamePattern := regexp.MustCompile(`\*\*Enabler Name\*\*:\s*(.+)`)
	featurePattern := regexp.MustCompile(`\*\*Feature\*\*:\s*(.+)`)
	priorityPattern := regexp.MustCompile(`\*\*Priority\*\*:\s*(.+)`)
	statusPattern := regexp.MustCompile(`\*\*Status\*\*:\s*(.+)`)
	automationPattern := regexp.MustCompile(`\*\*Automation\*\*:\s*(.+)`)
	requirementIDsPattern := regexp.MustCompile(`\*\*Requirement IDs\*\*:\s*(.+)`)
	tagsPattern := regexp.MustCompile(`\*\*Tags\*\*:\s*(.+)`)
	lastExecutedPattern := regexp.MustCompile(`\*\*Last Executed\*\*:\s*(.+)`)
	executionTimePattern := regexp.MustCompile(`\*\*Execution Time\*\*:\s*(.+)`)

	if match := idPattern.FindStringSubmatch(content); len(match) > 1 {
		scenario["id"] = strings.TrimSpace(match[1])
	} else {
		// Try to extract ID from filename
		scenario["id"] = strings.TrimSuffix(filename, ".md")
	}

	if match := enablerIDPattern.FindStringSubmatch(content); len(match) > 1 {
		scenario["enablerId"] = strings.TrimSpace(match[1])
	}

	if match := enablerNamePattern.FindStringSubmatch(content); len(match) > 1 {
		scenario["enablerName"] = strings.TrimSpace(match[1])
	}

	if match := featurePattern.FindStringSubmatch(content); len(match) > 1 {
		scenario["feature"] = strings.TrimSpace(match[1])
	}

	if match := priorityPattern.FindStringSubmatch(content); len(match) > 1 {
		scenario["priority"] = strings.TrimSpace(match[1])
	}

	if match := statusPattern.FindStringSubmatch(content); len(match) > 1 {
		scenario["status"] = strings.TrimSpace(match[1])
	}

	if match := automationPattern.FindStringSubmatch(content); len(match) > 1 {
		scenario["automation"] = strings.TrimSpace(match[1])
	}

	if match := requirementIDsPattern.FindStringSubmatch(content); len(match) > 1 {
		reqIds := strings.Split(strings.TrimSpace(match[1]), ",")
		var trimmedIds []string
		for _, id := range reqIds {
			trimmedIds = append(trimmedIds, strings.TrimSpace(id))
		}
		scenario["requirementIds"] = trimmedIds
	}

	if match := tagsPattern.FindStringSubmatch(content); len(match) > 1 {
		tags := strings.Split(strings.TrimSpace(match[1]), ",")
		var trimmedTags []string
		for _, tag := range tags {
			trimmedTags = append(trimmedTags, strings.TrimSpace(tag))
		}
		scenario["tags"] = trimmedTags
	}

	if match := lastExecutedPattern.FindStringSubmatch(content); len(match) > 1 {
		scenario["lastExecuted"] = strings.TrimSpace(match[1])
	}

	if match := executionTimePattern.FindStringSubmatch(content); len(match) > 1 {
		timeStr := strings.TrimSuffix(strings.TrimSpace(match[1]), "ms")
		if t, err := strconv.ParseFloat(timeStr, 64); err == nil {
			scenario["executionTime"] = t
		}
	}

	// Extract Gherkin content
	gherkinPattern := regexp.MustCompile("(?s)```gherkin\\s*(.+?)```")
	if match := gherkinPattern.FindStringSubmatch(content); len(match) > 1 {
		scenario["gherkin"] = strings.TrimSpace(match[1])
	}

	return scenario
}

// splitMultiCapabilityFile splits a file with multiple capabilities into separate files
func splitMultiCapabilityFile(filePath string, capabilities []FileCapability) error {
	if len(capabilities) <= 1 {
		return nil // Nothing to split
	}

	dir := filepath.Dir(filePath)

	// Create separate files for each capability
	for _, cap := range capabilities {
		// Generate filename from capability name
		safeName := strings.ToLower(cap.Name)
		safeName = strings.ReplaceAll(safeName, " ", "-")
		// Remove special characters
		safeName = strings.Map(func(r rune) rune {
			if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '-' {
				return r
			}
			return -1
		}, safeName)
		if safeName == "" {
			safeName = fmt.Sprintf("capability-%d", time.Now().UnixNano())
		}
		newFilePath := filepath.Join(dir, fmt.Sprintf("CAP-%s.md", safeName))

		// Build markdown content
		var content strings.Builder
		content.WriteString(fmt.Sprintf("# %s\n\n", cap.Name))
		if cap.Status != "" {
			content.WriteString(fmt.Sprintf("**Status:** %s\n\n", cap.Status))
		}
		if cap.Description != "" {
			content.WriteString(fmt.Sprintf("**Description:** %s\n\n", cap.Description))
		}
		// Add any remaining content
		if cap.Content != "" {
			content.WriteString(cap.Content)
		}

		// Write the new file
		if err := os.WriteFile(newFilePath, []byte(content.String()), 0644); err != nil {
			return err
		}
	}

	// Delete the original file
	if err := os.Remove(filePath); err != nil {
		return err
	}

	return nil
}

// parseMarkdownCapabilities parses a markdown file to extract multiple capabilities
// It splits on # or ## headings to find separate capabilities within the same file
func parseMarkdownCapabilities(filename, path, content string) []FileCapability {
	var capabilities []FileCapability
	lines := strings.Split(content, "\n")

	// Count # and ## headings to determine split strategy
	h1Count := 0
	h2Count := 0
	for _, line := range lines {
		trimmedLine := strings.TrimSpace(line)
		if strings.HasPrefix(trimmedLine, "## ") {
			h2Count++
		} else if strings.HasPrefix(trimmedLine, "# ") {
			h1Count++
		}
	}

	// Determine which heading level to split on
	// If there's exactly 1 # heading with ## subsections, this is a standard INTENT
	// capability document (# Title, ## Metadata, ## Business Context, etc.) - treat as single capability
	// If there are multiple # headings, split on # (multiple capabilities in one file)
	// If there are NO # headings but multiple ## headings, split on ## (legacy format)
	splitOnH2 := (h1Count == 0 && h2Count > 1)

	var capabilityBlocks []struct {
		name    string
		content []string
	}

	var currentBlock struct {
		name    string
		content []string
	}

	for _, line := range lines {
		trimmedLine := strings.TrimSpace(line)

		var isNewCapability bool
		var capName string

		if splitOnH2 {
			// Split on ## headings
			if strings.HasPrefix(trimmedLine, "## ") {
				isNewCapability = true
				capName = strings.TrimPrefix(trimmedLine, "## ")
			}
		} else {
			// Split on # headings (but not ##)
			if strings.HasPrefix(trimmedLine, "# ") && !strings.HasPrefix(trimmedLine, "## ") {
				isNewCapability = true
				capName = strings.TrimPrefix(trimmedLine, "# ")
			}
		}

		if isNewCapability {
			// Save previous block if it has content
			if currentBlock.name != "" || len(currentBlock.content) > 0 {
				capabilityBlocks = append(capabilityBlocks, currentBlock)
			}
			// Start new block
			currentBlock = struct {
				name    string
				content []string
			}{
				name:    capName,
				content: []string{},
			}
		} else {
			currentBlock.content = append(currentBlock.content, line)
		}
	}

	// Save last block
	if currentBlock.name != "" || len(currentBlock.content) > 0 {
		capabilityBlocks = append(capabilityBlocks, currentBlock)
	}

	// Filter out empty blocks (content before first heading)
	var filteredBlocks []struct {
		name    string
		content []string
	}
	for _, block := range capabilityBlocks {
		if block.name != "" {
			filteredBlocks = append(filteredBlocks, block)
		}
	}

	// If no named blocks found, treat entire file as single capability
	if len(filteredBlocks) == 0 {
		cap := parseSingleCapability(filename, path, content, "")
		return []FileCapability{cap}
	}

	// Parse each block as a separate capability
	for _, block := range filteredBlocks {
		blockContent := strings.Join(block.content, "\n")
		cap := parseSingleCapability(filename, path, blockContent, block.name)
		capabilities = append(capabilities, cap)
	}

	return capabilities
}

// parseSingleCapability parses content for a single capability
func parseSingleCapability(filename, path, content, name string) FileCapability {
	cap := FileCapability{
		Filename: filename,
		Path:     path,
		Content:  content,
		Name:     name,
		Fields:   make(map[string]string),
	}

	lines := strings.Split(content, "\n")
	var currentSection string
	var sectionContent []string

	for _, line := range lines {
		trimmedLine := strings.TrimSpace(line)

		// Check for section headers (## heading)
		if strings.HasPrefix(trimmedLine, "## ") {
			// Save previous section
			if currentSection != "" && len(sectionContent) > 0 {
				cap.Fields[currentSection] = strings.TrimSpace(strings.Join(sectionContent, "\n"))
			}
			currentSection = strings.TrimPrefix(trimmedLine, "## ")
			sectionContent = []string{}
			continue
		}

		// Check for subsection headers (### heading)
		if strings.HasPrefix(trimmedLine, "### ") {
			// Save previous section
			if currentSection != "" && len(sectionContent) > 0 {
				cap.Fields[currentSection] = strings.TrimSpace(strings.Join(sectionContent, "\n"))
			}
			currentSection = strings.TrimPrefix(trimmedLine, "### ")
			sectionContent = []string{}
			continue
		}

		// Look for specific field patterns
		// Handle various status formats: **Status:** value, Status: value, - **Status**: value
		// Make pattern matching case-insensitive
		trimmedLineLower := strings.ToLower(trimmedLine)
		if strings.HasPrefix(trimmedLineLower, "**status:**") || strings.HasPrefix(trimmedLineLower, "**status**:") ||
			strings.HasPrefix(trimmedLineLower, "status:") ||
			strings.HasPrefix(trimmedLineLower, "- **status**:") || strings.HasPrefix(trimmedLineLower, "- **status:**") {
			status := trimmedLine
			status = strings.TrimPrefix(status, "- ")
			// Remove all possible status prefixes (case-insensitive approach)
			for _, prefix := range []string{"**Status:**", "**status:**", "**Status**:", "**status**:", "Status:", "status:"} {
				if strings.HasPrefix(status, prefix) {
					status = strings.TrimPrefix(status, prefix)
					break
				}
			}
			cap.Status = strings.TrimSpace(status)
			continue
		}

		if strings.HasPrefix(trimmedLine, "**Description:**") || strings.HasPrefix(trimmedLine, "Description:") {
			desc := strings.TrimPrefix(trimmedLine, "**Description:**")
			desc = strings.TrimPrefix(desc, "Description:")
			cap.Description = strings.TrimSpace(desc)
			continue
		}

		// Look for Storyboard Reference field
		if strings.HasPrefix(trimmedLineLower, "**storyboard reference:**") || strings.HasPrefix(trimmedLineLower, "**storyboard reference**:") ||
			strings.HasPrefix(trimmedLineLower, "storyboard reference:") ||
			strings.HasPrefix(trimmedLineLower, "- **storyboard reference**:") || strings.HasPrefix(trimmedLineLower, "- **storyboard reference:**") {
			storyRef := trimmedLine
			storyRef = strings.TrimPrefix(storyRef, "- ")
			// Remove all possible storyboard reference prefixes
			for _, prefix := range []string{"**Storyboard Reference:**", "**storyboard reference:**", "**Storyboard Reference**:", "**storyboard reference**:", "Storyboard Reference:", "storyboard reference:"} {
				if strings.HasPrefix(storyRef, prefix) {
					storyRef = strings.TrimPrefix(storyRef, prefix)
					break
				}
			}
			cap.Fields["Storyboard Reference"] = strings.TrimSpace(storyRef)
			continue
		}

		// Look for Primary Persona field
		if strings.HasPrefix(trimmedLineLower, "**primary persona:**") || strings.HasPrefix(trimmedLineLower, "**primary persona**:") ||
			strings.HasPrefix(trimmedLineLower, "primary persona:") ||
			strings.HasPrefix(trimmedLineLower, "- **primary persona**:") || strings.HasPrefix(trimmedLineLower, "- **primary persona:**") {
			persona := trimmedLine
			persona = strings.TrimPrefix(persona, "- ")
			for _, prefix := range []string{"**Primary Persona:**", "**primary persona:**", "**Primary Persona**:", "**primary persona**:", "Primary Persona:", "primary persona:"} {
				if strings.HasPrefix(persona, prefix) {
					persona = strings.TrimPrefix(persona, prefix)
					break
				}
			}
			cap.Fields["Primary Persona"] = strings.TrimSpace(persona)
			continue
		}

		// NOTE: INTENT State Model fields (lifecycle_state, workflow_stage, stage_status, approval_status)
		// are NOT parsed from markdown. They are stored in the DATABASE only.

		// Add line to current section content
		if currentSection != "" {
			sectionContent = append(sectionContent, line)
		} else if cap.Description == "" && trimmedLine != "" && !strings.HasPrefix(trimmedLine, "#") {
			// Use first non-empty, non-header line as description if not set
			cap.Description = trimmedLine
		}
	}

	// Save last section
	if currentSection != "" && len(sectionContent) > 0 {
		cap.Fields[currentSection] = strings.TrimSpace(strings.Join(sectionContent, "\n"))
	}

	// If Description wasn't set from inline format, try to get it from Fields
	if cap.Description == "" {
		if desc, ok := cap.Fields["Description"]; ok && desc != "" {
			cap.Description = desc
		}
	}

	// Default name from filename if not found
	if cap.Name == "" {
		cap.Name = strings.TrimSuffix(filename, filepath.Ext(filename))
	}

	// Always use filename as source of truth for capability ID if filename starts with CAP-
	// This handles cases where metadata ID is missing or truncated
	if strings.HasPrefix(strings.ToUpper(filename), "CAP-") {
		// Extract full ID from filename by removing .md extension
		fullIdFromFilename := strings.TrimSuffix(filename, ".md")
		cap.CapabilityID = fullIdFromFilename
		cap.Fields["ID"] = fullIdFromFilename
	}

	return cap
}

// stripMetadataFromContent removes Status, Description, and INTENT State Model lines from content
// to prevent duplication when saving
func stripMetadataFromContent(content string) string {
	lines := strings.Split(content, "\n")
	var filteredLines []string
	inMetadataSection := false

	for _, line := range lines {
		trimmedLine := strings.TrimSpace(line)
		trimmedLineLower := strings.ToLower(trimmedLine)

		// Track if we're in the Metadata section
		if trimmedLine == "## Metadata" {
			inMetadataSection = true
			continue
		}

		// Exit metadata section when we hit another ## heading
		if strings.HasPrefix(trimmedLine, "## ") && trimmedLine != "## Metadata" {
			inMetadataSection = false
		}

		// Skip all lines in metadata section (they will be regenerated)
		if inMetadataSection {
			continue
		}

		// Skip status lines (legacy)
		if strings.HasPrefix(trimmedLineLower, "**status:**") ||
			strings.HasPrefix(trimmedLineLower, "**status**:") ||
			strings.HasPrefix(trimmedLineLower, "status:") ||
			strings.HasPrefix(trimmedLineLower, "- **status**:") ||
			strings.HasPrefix(trimmedLineLower, "- **status:**") {
			continue
		}

		// Skip description lines
		if strings.HasPrefix(trimmedLineLower, "**description:**") ||
			strings.HasPrefix(trimmedLineLower, "**description**:") ||
			strings.HasPrefix(trimmedLineLower, "description:") ||
			strings.HasPrefix(trimmedLineLower, "- **description**:") ||
			strings.HasPrefix(trimmedLineLower, "- **description:**") {
			continue
		}

		// Skip storyboard reference lines
		if strings.HasPrefix(trimmedLineLower, "**storyboard reference:**") ||
			strings.HasPrefix(trimmedLineLower, "**storyboard reference**:") ||
			strings.HasPrefix(trimmedLineLower, "storyboard reference:") ||
			strings.HasPrefix(trimmedLineLower, "- **storyboard reference**:") ||
			strings.HasPrefix(trimmedLineLower, "- **storyboard reference:**") {
			continue
		}

		// Skip INTENT State Model fields
		if strings.HasPrefix(trimmedLineLower, "**lifecycle state**:") ||
			strings.HasPrefix(trimmedLineLower, "- **lifecycle state**:") {
			continue
		}
		if strings.HasPrefix(trimmedLineLower, "**workflow stage**:") ||
			strings.HasPrefix(trimmedLineLower, "- **workflow stage**:") {
			continue
		}
		if strings.HasPrefix(trimmedLineLower, "**stage status**:") ||
			strings.HasPrefix(trimmedLineLower, "- **stage status**:") {
			continue
		}
		if strings.HasPrefix(trimmedLineLower, "**approval status**:") ||
			strings.HasPrefix(trimmedLineLower, "- **approval status**:") {
			continue
		}

		// Skip title lines (# heading)
		if strings.HasPrefix(trimmedLine, "# ") && !strings.HasPrefix(trimmedLine, "## ") {
			continue
		}

		filteredLines = append(filteredLines, line)
	}

	// Trim leading empty lines
	result := strings.TrimSpace(strings.Join(filteredLines, "\n"))
	return result
}

// StoryFilesRequest represents the request body for fetching story files
type StoryFilesRequest struct {
	WorkspacePath string `json:"workspacePath"`
}

// FileStory represents a story parsed from a markdown file
type FileStory struct {
	ID          string            `json:"id"`
	Filename    string            `json:"filename"`
	Path        string            `json:"path"`
	Title       string            `json:"title"`
	Description string            `json:"description"`
	Status      string            `json:"status"`
	Content     string            `json:"content"`
	Fields      map[string]string `json:"fields"`
	ImageUrl    string            `json:"imageUrl,omitempty"`
}

// HandleStoryFiles handles POST /story-files
func (h *Handler) HandleStoryFiles(w http.ResponseWriter, r *http.Request) {
	var req StoryFilesRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.WorkspacePath == "" {
		http.Error(w, "workspacePath is required", http.StatusBadRequest)
		return
	}

	// Story files are stored in the conception folder
	// Handle both relative and absolute paths, and Docker volume mounts
	var specsPath string
	workspacePath := req.WorkspacePath

	// If path contains "workspaces/", extract the relative part
	// This handles both absolute host paths and relative paths
	if idx := strings.Index(workspacePath, "workspaces/"); idx != -1 {
		workspacePath = workspacePath[idx:]
	}

	// Get current working directory
	cwd, err := os.Getwd()
	if err != nil {
		http.Error(w, fmt.Sprintf("failed to get working directory: %v", err), http.StatusInternalServerError)
		return
	}
	specsPath = filepath.Join(cwd, workspacePath, "conception")

	// Check if conception folder exists
	if _, err := os.Stat(specsPath); os.IsNotExist(err) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"stories": []FileStory{},
		})
		return
	}

	// Find story files matching patterns: story*, STORY*, SB-*
	var stories []FileStory
	patterns := []string{"story", "STORY", "SB-"}

	err = filepath.Walk(specsPath, func(path string, info os.FileInfo, walkErr error) error {
		if walkErr != nil {
			return nil // Skip errors
		}

		if info.IsDir() {
			return nil
		}

		// Check if file matches any pattern (case-insensitive)
		filename := info.Name()
		filenameUpper := strings.ToUpper(filename)
		matched := false
		for _, pattern := range patterns {
			if strings.HasPrefix(filenameUpper, strings.ToUpper(pattern)) {
				matched = true
				break
			}
		}

		if !matched {
			return nil
		}

		// Only process markdown files
		if !strings.HasSuffix(strings.ToLower(filename), ".md") {
			return nil
		}

		// Read file content
		content, err := os.ReadFile(path)
		if err != nil {
			return nil // Skip files we can't read
		}

		// Parse the markdown to extract story information (may return multiple stories)
		parsedStories := parseMultipleStories(filename, path, string(content))

		// If file contains multiple stories, split it into separate files
		if len(parsedStories) > 1 {
			if err := splitMultiStoryFile(path, parsedStories); err != nil {
				fmt.Printf("Warning: failed to split multi-story file %s: %v\n", path, err)
			}
			// Update paths for the split files
			dir := filepath.Dir(path)
			for i := range parsedStories {
				safeName := strings.ToLower(parsedStories[i].Title)
				safeName = strings.ReplaceAll(safeName, " ", "-")
				safeName = strings.Map(func(r rune) rune {
					if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '-' {
						return r
					}
					return -1
				}, safeName)
				if safeName == "" {
					safeName = fmt.Sprintf("story-%d", i)
				}
				parsedStories[i].Filename = fmt.Sprintf("STORY-%s.md", safeName)
				parsedStories[i].Path = filepath.Join(dir, parsedStories[i].Filename)
			}
		}

		stories = append(stories, parsedStories...)

		return nil
	})

	if err != nil {
		http.Error(w, fmt.Sprintf("failed to scan specifications folder: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"stories": stories,
	})
}

// splitMultiStoryFile splits a file with multiple stories into separate files
func splitMultiStoryFile(filePath string, stories []FileStory) error {
	if len(stories) <= 1 {
		return nil
	}

	dir := filepath.Dir(filePath)

	for _, story := range stories {
		safeName := strings.ToLower(story.Title)
		safeName = strings.ReplaceAll(safeName, " ", "-")
		safeName = strings.Map(func(r rune) rune {
			if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '-' {
				return r
			}
			return -1
		}, safeName)
		if safeName == "" {
			safeName = fmt.Sprintf("story-%d", time.Now().UnixNano())
		}
		newFilePath := filepath.Join(dir, fmt.Sprintf("STORY-%s.md", safeName))

		var content strings.Builder
		content.WriteString(fmt.Sprintf("# %s\n\n", story.Title))
		if story.Status != "" {
			content.WriteString(fmt.Sprintf("**Status:** %s\n\n", story.Status))
		}
		if story.Description != "" {
			content.WriteString(fmt.Sprintf("**Description:** %s\n\n", story.Description))
		}
		if story.Content != "" {
			content.WriteString(story.Content)
		}

		if err := os.WriteFile(newFilePath, []byte(content.String()), 0644); err != nil {
			return err
		}
	}

	return os.Remove(filePath)
}

// parseMultipleStories parses a markdown file to extract multiple stories
func parseMultipleStories(filename, path, content string) []FileStory {
	var stories []FileStory
	lines := strings.Split(content, "\n")

	// Count # headings to determine if there are multiple stories
	h1Count := 0
	for _, line := range lines {
		trimmedLine := strings.TrimSpace(line)
		if strings.HasPrefix(trimmedLine, "# ") && !strings.HasPrefix(trimmedLine, "## ") {
			h1Count++
		}
	}

	// Only split on # headings if there are multiple top-level stories
	// Do NOT split on ## headings - those are sections within a single story
	splitOnH2 := false // Never split on ## - sections are part of a single story

	var storyBlocks []struct {
		name    string
		content []string
	}

	var currentBlock struct {
		name    string
		content []string
	}

	for _, line := range lines {
		trimmedLine := strings.TrimSpace(line)

		var isNewStory bool
		var storyName string

		if splitOnH2 {
			if strings.HasPrefix(trimmedLine, "## ") {
				isNewStory = true
				storyName = strings.TrimPrefix(trimmedLine, "## ")
			}
		} else {
			if strings.HasPrefix(trimmedLine, "# ") && !strings.HasPrefix(trimmedLine, "## ") {
				isNewStory = true
				storyName = strings.TrimPrefix(trimmedLine, "# ")
			}
		}

		if isNewStory {
			if currentBlock.name != "" || len(currentBlock.content) > 0 {
				storyBlocks = append(storyBlocks, currentBlock)
			}
			currentBlock = struct {
				name    string
				content []string
			}{
				name:    storyName,
				content: []string{},
			}
		} else {
			currentBlock.content = append(currentBlock.content, line)
		}
	}

	if currentBlock.name != "" || len(currentBlock.content) > 0 {
		storyBlocks = append(storyBlocks, currentBlock)
	}

	// Filter out empty blocks
	var filteredBlocks []struct {
		name    string
		content []string
	}
	for _, block := range storyBlocks {
		if block.name != "" {
			filteredBlocks = append(filteredBlocks, block)
		}
	}

	if len(filteredBlocks) == 0 {
		story := parseSingleStory(filename, path, content, "")
		return []FileStory{story}
	}

	for _, block := range filteredBlocks {
		blockContent := strings.Join(block.content, "\n")
		story := parseSingleStory(filename, path, blockContent, block.name)
		stories = append(stories, story)
	}

	return stories
}

// parseSingleStory parses content for a single story
func parseSingleStory(filename, path, content, title string) FileStory {
	story := FileStory{
		ID:       fmt.Sprintf("file-%s-%d", strings.TrimSuffix(filename, filepath.Ext(filename)), time.Now().UnixNano()),
		Filename: filename,
		Path:     path,
		Content:  content,
		Title:    title,
		Fields:   make(map[string]string),
	}

	lines := strings.Split(content, "\n")
	var currentSection string
	var sectionContent []string

	for _, line := range lines {
		trimmedLine := strings.TrimSpace(line)

		// Check for section headers (## or ### heading)
		if strings.HasPrefix(trimmedLine, "### ") {
			if currentSection != "" && len(sectionContent) > 0 {
				story.Fields[currentSection] = strings.TrimSpace(strings.Join(sectionContent, "\n"))
			}
			currentSection = strings.TrimPrefix(trimmedLine, "### ")
			sectionContent = []string{}
			continue
		}

		// Look for specific field patterns
		if strings.HasPrefix(trimmedLine, "**Status:**") || strings.HasPrefix(trimmedLine, "Status:") {
			status := strings.TrimPrefix(trimmedLine, "**Status:**")
			status = strings.TrimPrefix(status, "Status:")
			story.Status = strings.TrimSpace(status)
			continue
		}

		if strings.HasPrefix(trimmedLine, "**Description:**") || strings.HasPrefix(trimmedLine, "Description:") {
			desc := strings.TrimPrefix(trimmedLine, "**Description:**")
			desc = strings.TrimPrefix(desc, "Description:")
			story.Description = strings.TrimSpace(desc)
			continue
		}

		// Parse Card ID field - this is the primary identifier used by Storyboard
		// Handle various formats: "**Card ID**:", "Card ID:", "- **Card ID**:", etc.
		if strings.Contains(trimmedLine, "**Card ID**:") || strings.Contains(trimmedLine, "Card ID:") {
			cardID := trimmedLine
			// Remove bullet point prefix if present
			cardID = strings.TrimPrefix(cardID, "- ")
			cardID = strings.TrimPrefix(cardID, "* ")
			// Remove bold markers and field name
			cardID = strings.TrimPrefix(cardID, "**Card ID**:")
			cardID = strings.TrimPrefix(cardID, "Card ID:")
			story.Fields["Card ID"] = strings.TrimSpace(cardID)
			continue
		}

		// Add line to current section content
		if currentSection != "" {
			sectionContent = append(sectionContent, line)
		} else if story.Description == "" && trimmedLine != "" && !strings.HasPrefix(trimmedLine, "#") {
			story.Description = trimmedLine
		}
	}

	if currentSection != "" && len(sectionContent) > 0 {
		story.Fields[currentSection] = strings.TrimSpace(strings.Join(sectionContent, "\n"))
	}

	if story.Title == "" {
		story.Title = strings.TrimSuffix(filename, filepath.Ext(filename))
	}

	if story.Status == "" {
		story.Status = "pending"
	}

	return story
}

// IdeationFilesRequest represents the request body for fetching ideation files
type IdeationFilesRequest struct {
	WorkspacePath string `json:"workspacePath"`
}

// FileIdeation represents an ideation parsed from a markdown file
type FileIdeation struct {
	ID          string            `json:"id"`
	Filename    string            `json:"filename"`
	Path        string            `json:"path"`
	Name        string            `json:"name"`
	Description string            `json:"description"`
	Status      string            `json:"status"`
	Content     string            `json:"content"`
	Fields      map[string]string `json:"fields"`
	Tags        []string          `json:"tags,omitempty"`
	LastModified string           `json:"lastModified,omitempty"`
}

// HandleIdeationFiles handles POST /ideation-files
func (h *Handler) HandleIdeationFiles(w http.ResponseWriter, r *http.Request) {
	var req IdeationFilesRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.WorkspacePath == "" {
		http.Error(w, "workspacePath is required", http.StatusBadRequest)
		return
	}

	// Ideation files are stored in the conception folder
	var specsPath string
	workspacePath := req.WorkspacePath

	// If path contains "workspaces/", extract the relative part
	if idx := strings.Index(workspacePath, "workspaces/"); idx != -1 {
		workspacePath = workspacePath[idx:]
	}

	// Get current working directory
	cwd, err := os.Getwd()
	if err != nil {
		http.Error(w, fmt.Sprintf("failed to get working directory: %v", err), http.StatusInternalServerError)
		return
	}
	specsPath = filepath.Join(cwd, workspacePath, "conception")

	// Check if conception folder exists
	if _, err := os.Stat(specsPath); os.IsNotExist(err) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"ideas": []FileIdeation{},
		})
		return
	}

	// Find ideation files matching patterns: IDEA-*
	var ideas []FileIdeation

	err = filepath.Walk(specsPath, func(path string, info os.FileInfo, walkErr error) error {
		if walkErr != nil {
			return nil // Skip errors
		}

		if info.IsDir() {
			return nil
		}

		// Match IDEA-*.md files
		filename := info.Name()
		if !strings.HasSuffix(strings.ToLower(filename), ".md") {
			return nil
		}

		filenameUpper := strings.ToUpper(filename)
		if !strings.HasPrefix(filenameUpper, "IDEA-") {
			return nil
		}

		// Read and parse the file
		content, err := os.ReadFile(path)
		if err != nil {
			return nil
		}

		idea := parseIdeationFile(filename, path, string(content))
		idea.LastModified = info.ModTime().Format(time.RFC3339)
		ideas = append(ideas, idea)

		return nil
	})

	if err != nil {
		http.Error(w, fmt.Sprintf("failed to read ideation files: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"ideas": ideas,
	})
}

// parseIdeationFile parses a markdown file to extract ideation information
func parseIdeationFile(filename, path, content string) FileIdeation {
	idea := FileIdeation{
		ID:       strings.TrimSuffix(filename, filepath.Ext(filename)),
		Filename: filename,
		Path:     path,
		Content:  content,
		Fields:   make(map[string]string),
	}

	lines := strings.Split(content, "\n")
	var currentSection string
	var sectionContent []string

	for _, line := range lines {
		trimmedLine := strings.TrimSpace(line)

		// Parse # heading as name
		if strings.HasPrefix(trimmedLine, "# ") && !strings.HasPrefix(trimmedLine, "## ") {
			idea.Name = strings.TrimPrefix(trimmedLine, "# ")
			continue
		}

		// Check for section headers (## heading)
		if strings.HasPrefix(trimmedLine, "## ") {
			if currentSection != "" && len(sectionContent) > 0 {
				idea.Fields[currentSection] = strings.TrimSpace(strings.Join(sectionContent, "\n"))
			}
			currentSection = strings.TrimPrefix(trimmedLine, "## ")
			sectionContent = []string{}
			continue
		}

		// Parse metadata fields
		if strings.HasPrefix(trimmedLine, "- **ID**:") || strings.HasPrefix(trimmedLine, "**ID:**") {
			id := trimmedLine
			id = strings.TrimPrefix(id, "- **ID**:")
			id = strings.TrimPrefix(id, "- **ID:**")
			id = strings.TrimPrefix(id, "**ID:**")
			id = strings.TrimPrefix(id, "**ID**:")
			idea.ID = strings.TrimSpace(id)
			continue
		}

		if strings.HasPrefix(trimmedLine, "- **Status**:") || strings.HasPrefix(trimmedLine, "**Status:**") {
			status := trimmedLine
			status = strings.TrimPrefix(status, "- **Status**:")
			status = strings.TrimPrefix(status, "- **Status:**")
			status = strings.TrimPrefix(status, "**Status:**")
			status = strings.TrimPrefix(status, "**Status**:")
			idea.Status = strings.TrimSpace(status)
			continue
		}

		if strings.HasPrefix(trimmedLine, "- **Tags**:") || strings.HasPrefix(trimmedLine, "**Tags:**") {
			tagsStr := trimmedLine
			tagsStr = strings.TrimPrefix(tagsStr, "- **Tags**:")
			tagsStr = strings.TrimPrefix(tagsStr, "- **Tags:**")
			tagsStr = strings.TrimPrefix(tagsStr, "**Tags:**")
			tagsStr = strings.TrimPrefix(tagsStr, "**Tags**:")
			tagsStr = strings.TrimSpace(tagsStr)
			if tagsStr != "" {
				tags := strings.Split(tagsStr, ",")
				for i, tag := range tags {
					tags[i] = strings.TrimSpace(tag)
				}
				idea.Tags = tags
			}
			continue
		}

		// Add line to current section content
		if currentSection != "" {
			sectionContent = append(sectionContent, line)
		} else if idea.Description == "" && trimmedLine != "" && !strings.HasPrefix(trimmedLine, "#") && !strings.HasPrefix(trimmedLine, "-") {
			idea.Description = trimmedLine
		}
	}

	// Save last section
	if currentSection != "" && len(sectionContent) > 0 {
		idea.Fields[currentSection] = strings.TrimSpace(strings.Join(sectionContent, "\n"))
	}

	// Default name from filename if not found
	if idea.Name == "" {
		idea.Name = strings.TrimSuffix(filename, filepath.Ext(filename))
	}

	return idea
}

// AnalyzeStoryboardRequest represents the request for storyboard analysis
type AnalyzeStoryboardRequest struct {
	WorkspacePath string `json:"workspacePath"`
	APIKey        string `json:"apiKey"`
	ForceRegenerate bool   `json:"forceRegenerate"`
}

// StoryboardAnalysisResult represents the analyzed storyboard data
type StoryboardAnalysisResult struct {
	Cards       []AnalyzedCard       `json:"cards"`
	Connections []AnalyzedConnection `json:"connections"`
	Error       string               `json:"error,omitempty"`
}

// AnalyzedCard represents a card from the analysis
type AnalyzedCard struct {
	ID          string `json:"id"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Status      string `json:"status"`
	X           int    `json:"x"`
	Y           int    `json:"y"`
}

// AnalyzedConnection represents a connection between cards
type AnalyzedConnection struct {
	ID   string `json:"id"`
	From string `json:"from"`
	To   string `json:"to"`
}

// HandleAnalyzeStoryboard handles POST /analyze-storyboard
func (h *Handler) HandleAnalyzeStoryboard(w http.ResponseWriter, r *http.Request) {
	var req AnalyzeStoryboardRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(StoryboardAnalysisResult{
			Error: "invalid request body",
		})
		return
	}

	if req.WorkspacePath == "" {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(StoryboardAnalysisResult{
			Error: "workspacePath is required",
		})
		return
	}

	specsPath := filepath.Join(req.WorkspacePath, "specifications")
	fullPath := filepath.Join(specsPath, "storyboards-full.md")

	// Check if storyboards-full.md exists and load from it (unless forcing regeneration)
	if !req.ForceRegenerate {
		if content, err := os.ReadFile(fullPath); err == nil {
			// Parse the JSON from the file
			contentStr := string(content)
			jsonStart := strings.Index(contentStr, "```json")
			jsonEnd := strings.Index(contentStr, "```\n")
			if jsonStart != -1 && jsonEnd != -1 && jsonEnd > jsonStart {
				jsonStr := contentStr[jsonStart+7 : jsonEnd]
				var result StoryboardAnalysisResult
				if err := json.Unmarshal([]byte(strings.TrimSpace(jsonStr)), &result); err == nil {
					w.Header().Set("Content-Type", "application/json")
					json.NewEncoder(w).Encode(result)
					return
				}
			}
		}
	}

	// Need API key for regeneration
	if req.APIKey == "" {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(StoryboardAnalysisResult{
			Error: "apiKey is required for analysis",
		})
		return
	}

	// Read the relevant markdown files
	var filesContent strings.Builder
	filesToRead := []string{
		"storyboards.md", "storyboard.md", "stories.md",
		"dependencies.md", "dependency.md",
		"site-architecture.md", "architecture.md", "sitemap.md",
	}

	filesFound := 0
	for _, filename := range filesToRead {
		filePath := filepath.Join(specsPath, filename)
		content, err := os.ReadFile(filePath)
		if err == nil {
			filesContent.WriteString(fmt.Sprintf("\n=== %s ===\n%s\n", filename, string(content)))
			filesFound++
		}
	}

	// Also read any STORY-*.md files
	filepath.Walk(specsPath, func(path string, info os.FileInfo, err error) error {
		if err != nil || info.IsDir() {
			return nil
		}
		if strings.HasPrefix(strings.ToUpper(info.Name()), "STORY") && strings.HasSuffix(info.Name(), ".md") {
			content, err := os.ReadFile(path)
			if err == nil {
				filesContent.WriteString(fmt.Sprintf("\n=== %s ===\n%s\n", info.Name(), string(content)))
				filesFound++
			}
		}
		return nil
	})

	if filesFound == 0 {
		// Check if storyboards-full.md exists - if so, we should have loaded it earlier
		// This means parsing failed, so return a helpful error
		if _, err := os.Stat(fullPath); err == nil {
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(StoryboardAnalysisResult{
				Error: "storyboards-full.md exists but could not be parsed. Please check the file format or delete it to regenerate.",
			})
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(StoryboardAnalysisResult{
			Error: "No specification files found (STORY*.md, dependencies.md, site-architecture.md). Please add some specification files first.",
		})
		return
	}

	// Build the prompt for Claude
	prompt := fmt.Sprintf(`Analyze the following markdown files and create a comprehensive storyboard diagram structure.

Your task is to:
1. Identify all distinct stories, features, or user flows
2. Determine the dependencies and relationships between them
3. Assign appropriate positions (x, y) for a clean flow diagram layout
4. Determine the status of each item (pending, in-progress, or completed)

IMPORTANT: Return ONLY valid JSON, no other text. The JSON must follow this exact structure:

{
  "cards": [
    {
      "id": "card-1",
      "title": "Story Title",
      "description": "Brief description of this story/feature",
      "status": "pending",
      "x": 100,
      "y": 100
    }
  ],
  "connections": [
    {
      "id": "conn-1-2",
      "from": "card-1",
      "to": "card-2"
    }
  ]
}

Layout Guidelines:
- Start positions at x=100, y=100
- Space cards horizontally by 400px for related items
- Space cards vertically by 200px for sequential flow
- Create a logical left-to-right, top-to-bottom flow
- Group related features together
- Entry points should be at the top/left
- Terminal states should be at the bottom/right

Status Guidelines:
- "completed" - if marked as done/implemented
- "in-progress" - if partially done or being worked on
- "pending" - default for new/planned items

Connection Guidelines:
- Connect items that have dependencies
- Connect sequential user flow steps
- Connect parent features to child features
- A connection means "from" must be done before "to" can start

Here are the files to analyze:
%s

Remember: Return ONLY the JSON object, nothing else.`, filesContent.String())

	// Call Claude API
	client := NewAnthropicClient(req.APIKey)
	response, err := client.SendMessage(r.Context(), prompt)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(StoryboardAnalysisResult{
			Error: fmt.Sprintf("Failed to analyze with Claude: %v", err),
		})
		return
	}

	// Parse the JSON response from Claude
	// Find the JSON in the response (in case Claude adds extra text)
	jsonStart := strings.Index(response, "{")
	jsonEnd := strings.LastIndex(response, "}")
	if jsonStart == -1 || jsonEnd == -1 {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(StoryboardAnalysisResult{
			Error: "Claude did not return valid JSON",
		})
		return
	}

	jsonStr := response[jsonStart : jsonEnd+1]

	var result StoryboardAnalysisResult
	if err := json.Unmarshal([]byte(jsonStr), &result); err != nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(StoryboardAnalysisResult{
			Error: fmt.Sprintf("Failed to parse Claude response: %v", err),
		})
		return
	}

	// Save the result to storyboards-full.md
	var fullContent strings.Builder
	fullContent.WriteString("# Generated Storyboard Analysis\n\n")
	fullContent.WriteString(fmt.Sprintf("Generated: %s\n\n", time.Now().Format(time.RFC3339)))
	fullContent.WriteString("## Storyboard Data (JSON)\n\n```json\n")

	jsonBytes, _ := json.MarshalIndent(result, "", "  ")
	fullContent.WriteString(string(jsonBytes))
	fullContent.WriteString("\n```\n")

	os.WriteFile(fullPath, []byte(fullContent.String()), 0644)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

// ActivateAIPresetRequest represents the request body for activating an AI preset
type ActivateAIPresetRequest struct {
	WorkspacePath string `json:"workspacePath"`
	PresetNumber  int    `json:"presetNumber"`
}

// SaveSpecificationsRequest represents the request body for saving specification files
type SaveSpecificationsRequest struct {
	WorkspacePath string                    `json:"workspacePath"`
	Files         []SpecificationFileData   `json:"files"`
	Subfolder     string                    `json:"subfolder"` // Optional: defaults to "specifications"
}

// SpecificationFileData represents a single file to save
type SpecificationFileData struct {
	FileName string `json:"fileName"`
	Content  string `json:"content"`
}

// SaveImageRequest represents the request body for saving an image file
type SaveImageRequest struct {
	WorkspacePath string `json:"workspacePath"`
	FileName      string `json:"fileName"`
	ImageData     string `json:"imageData"` // Base64 encoded
	MimeType      string `json:"mimeType"`
}

// HandleSaveImage handles POST /save-image
func (h *Handler) HandleSaveImage(w http.ResponseWriter, r *http.Request) {
	var req SaveImageRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.WorkspacePath == "" {
		http.Error(w, "workspacePath is required", http.StatusBadRequest)
		return
	}

	if req.FileName == "" || req.ImageData == "" {
		http.Error(w, "fileName and imageData are required", http.StatusBadRequest)
		return
	}

	// Ensure specifications folder exists
	specificationsPath := filepath.Join(req.WorkspacePath, "specifications")
	if err := os.MkdirAll(specificationsPath, 0755); err != nil {
		http.Error(w, fmt.Sprintf("failed to create specifications folder: %v", err), http.StatusInternalServerError)
		return
	}

	// Decode base64 image data
	imageBytes, err := base64.StdEncoding.DecodeString(req.ImageData)
	if err != nil {
		http.Error(w, fmt.Sprintf("failed to decode image data: %v", err), http.StatusBadRequest)
		return
	}

	// Save the image file
	filePath := filepath.Join(specificationsPath, req.FileName)
	if err := os.WriteFile(filePath, imageBytes, 0644); err != nil {
		http.Error(w, fmt.Sprintf("failed to write image file: %v", err), http.StatusInternalServerError)
		return
	}

	fmt.Printf("[SaveImage] Saved image to %s (%d bytes)\n", filePath, len(imageBytes))

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": fmt.Sprintf("Image saved to specifications/%s", req.FileName),
		"path":    filePath,
	})
}

// HandleActivateAIPreset handles POST /activate-ai-preset
func (h *Handler) HandleActivateAIPreset(w http.ResponseWriter, r *http.Request) {
	var req ActivateAIPresetRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.WorkspacePath == "" {
		http.Error(w, "workspacePath is required", http.StatusBadRequest)
		return
	}

	if req.PresetNumber < 1 || req.PresetNumber > 5 {
		http.Error(w, "presetNumber must be between 1 and 5", http.StatusBadRequest)
		return
	}

	// Copy the AI policy preset file to the workspace specifications folder
	if err := CopyAIPolicyPresetPublic(req.PresetNumber, req.WorkspacePath); err != nil {
		http.Error(w, fmt.Sprintf("failed to copy AI preset: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": fmt.Sprintf("AI Preset %d activated and copied to implementation folder", req.PresetNumber),
	})
}

// HandleAnalyzeConception handles POST /analyze-conception
// Reads conception files and generates capability proposals using Capability-Driven Architecture Map
func (h *Handler) HandleAnalyzeConception(w http.ResponseWriter, r *http.Request) {
	var req struct {
		WorkspacePath        string   `json:"workspacePath"`
		AnthropicKey         string   `json:"anthropic_key"`
		ExistingCapabilities []string `json:"existingCapabilities"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.WorkspacePath == "" {
		http.Error(w, "workspacePath is required", http.StatusBadRequest)
		return
	}

	if req.AnthropicKey == "" {
		http.Error(w, "anthropic_key is required", http.StatusBadRequest)
		return
	}

	// Get current working directory
	cwd, err := os.Getwd()
	if err != nil {
		http.Error(w, fmt.Sprintf("failed to get working directory: %v", err), http.StatusInternalServerError)
		return
	}

	// Build path to conception folder
	conceptionPath := filepath.Join(cwd, req.WorkspacePath, "conception")

	// Check if conception folder exists
	if _, err := os.Stat(conceptionPath); os.IsNotExist(err) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"suggestions": []interface{}{},
			"message":     "No conception folder found. Please create ideas, vision, and storyboard content first.",
		})
		return
	}

	// Read all markdown files from conception folder
	entries, err := os.ReadDir(conceptionPath)
	if err != nil {
		http.Error(w, fmt.Sprintf("failed to read conception folder: %v", err), http.StatusInternalServerError)
		return
	}

	var allContent strings.Builder
	allContent.WriteString("# Conception Phase Documents\n\n")
	allContent.WriteString("These documents represent the ideation, vision, and value propositions for the system.\n\n")

	fileCount := 0
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		fileName := entry.Name()
		if !strings.HasSuffix(strings.ToLower(fileName), ".md") {
			continue
		}

		filePath := filepath.Join(conceptionPath, fileName)
		content, err := os.ReadFile(filePath)
		if err != nil {
			continue
		}

		// Categorize the file type
		var fileType string
		switch {
		case strings.HasPrefix(fileName, "VIS-"):
			fileType = "Vision Statement"
		case strings.HasPrefix(fileName, "STRAT-"):
			fileType = "Strategic Theme"
		case strings.HasPrefix(fileName, "MKT-"):
			fileType = "Market Context"
		case strings.HasPrefix(fileName, "STORY-"):
			fileType = "User Story/Storyboard"
		case strings.HasPrefix(fileName, "IDEA-"):
			fileType = "Ideation Card"
		case strings.Contains(fileName, "INDEX"):
			fileType = "Index/Overview"
		default:
			fileType = "Conception Document"
		}

		allContent.WriteString(fmt.Sprintf("## %s: %s\n\n%s\n\n---\n\n", fileType, fileName, string(content)))
		fileCount++
	}

	if fileCount == 0 {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"suggestions": []interface{}{},
			"message":     "No markdown files found in conception folder. Please create ideas, vision, and storyboard content first.",
		})
		return
	}

	// Add existing capabilities to avoid duplicates
	if len(req.ExistingCapabilities) > 0 {
		allContent.WriteString("# Existing Capabilities (Do NOT suggest these)\n\n")
		for _, cap := range req.ExistingCapabilities {
			allContent.WriteString(fmt.Sprintf("- %s\n", cap))
		}
		allContent.WriteString("\n")
	}

	// Create Capability-Driven Architecture Map prompt
	prompt := fmt.Sprintf(`You are a software architect using the Capability-Driven Architecture Map methodology to decompose abstract software ideas into concrete capabilities.

A Capability-Driven Architecture Map visualizes WHAT the system must be able to do (capabilities) before focusing on HOW it is built. It creates a clear lineage from:
  idea → value → capability → enabler → module → component

Your task is to analyze the conception phase documents below and propose capabilities based on the ideas, visions, stories, and themes described.

%s

Based on your analysis of these conception documents, propose 3-7 NEW capabilities that:
1. Represent distinct business functions the system must perform
2. Are user-centric and meaningful to end users or business stakeholders
3. Are largely self-contained with clear boundaries
4. Are at the right level of granularity (not too broad like "entire application", not too narrow like "single function")
5. Follow common capability patterns like: User Management, Data Management, Integration, Reporting, Communication, Security, Configuration

For each capability, provide:
1. A clear, business-focused name (noun-based, e.g., "User Authentication", "Report Generation")
2. A comprehensive description of what business value it delivers
3. The rationale explaining how it derives from the conception documents
4. Key success metrics that would indicate the capability is working

Return your response as a JSON object with this exact format:
{
  "suggestions": [
    {
      "name": "Capability Name",
      "description": "Detailed description of what this capability enables users to do and what business value it provides",
      "type": "capability",
      "rationale": "How this capability was derived from the conception documents - reference specific ideas, stories, or themes",
      "successMetrics": ["Metric 1", "Metric 2"]
    }
  ],
  "analysis": {
    "totalConceptionDocuments": %d,
    "keyThemes": ["theme1", "theme2"],
    "coverageNotes": "Brief notes on how well the proposed capabilities cover the conception documents"
  }
}

Only return the JSON, no other text.`, allContent.String(), fileCount)

	// Call Claude API
	requestBody := map[string]interface{}{
		"model":      "claude-sonnet-4-20250514",
		"max_tokens": 8192,
		"messages": []map[string]string{
			{
				"role":    "user",
				"content": prompt,
			},
		},
	}

	jsonBody, err := json.Marshal(requestBody)
	if err != nil {
		http.Error(w, fmt.Sprintf("failed to marshal request: %v", err), http.StatusInternalServerError)
		return
	}

	httpReq, err := http.NewRequest("POST", "https://api.anthropic.com/v1/messages", strings.NewReader(string(jsonBody)))
	if err != nil {
		http.Error(w, fmt.Sprintf("failed to create request: %v", err), http.StatusInternalServerError)
		return
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("x-api-key", req.AnthropicKey)
	httpReq.Header.Set("anthropic-version", "2023-06-01")

	client := &http.Client{Timeout: 120 * time.Second}
	resp, err := client.Do(httpReq)
	if err != nil {
		http.Error(w, fmt.Sprintf("failed to call Claude API: %v", err), http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		http.Error(w, fmt.Sprintf("Claude API error: %s", string(body)), resp.StatusCode)
		return
	}

	var claudeResp struct {
		Content []struct {
			Text string `json:"text"`
		} `json:"content"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&claudeResp); err != nil {
		http.Error(w, fmt.Sprintf("failed to decode Claude response: %v", err), http.StatusInternalServerError)
		return
	}

	if len(claudeResp.Content) == 0 {
		http.Error(w, "empty response from Claude", http.StatusInternalServerError)
		return
	}

	// Parse the JSON response from Claude
	responseText := claudeResp.Content[0].Text

	// Extract JSON from response (in case there's extra text)
	jsonStart := strings.Index(responseText, "{")
	jsonEnd := strings.LastIndex(responseText, "}")
	if jsonStart == -1 || jsonEnd == -1 {
		http.Error(w, "invalid JSON in Claude response", http.StatusInternalServerError)
		return
	}

	jsonStr := responseText[jsonStart : jsonEnd+1]

	// Return the raw JSON response
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(jsonStr))
}

// HandleAnalyzeCapabilities handles POST /analyze-capabilities
// Reads capability files and generates enabler proposals using AI analysis
func (h *Handler) HandleAnalyzeCapabilities(w http.ResponseWriter, r *http.Request) {
	var req struct {
		WorkspacePath     string   `json:"workspacePath"`
		AnthropicKey      string   `json:"anthropic_key"`
		ExistingEnablers  []string `json:"existingEnablers"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.WorkspacePath == "" {
		http.Error(w, "workspacePath is required", http.StatusBadRequest)
		return
	}

	if req.AnthropicKey == "" {
		http.Error(w, "anthropic_key is required", http.StatusBadRequest)
		return
	}

	// Get current working directory
	cwd, err := os.Getwd()
	if err != nil {
		http.Error(w, fmt.Sprintf("failed to get working directory: %v", err), http.StatusInternalServerError)
		return
	}

	// Build path to definition folder where CAP-*.md files are stored
	definitionPath := filepath.Join(cwd, req.WorkspacePath, "definition")

	// Check if definition folder exists
	if _, err := os.Stat(definitionPath); os.IsNotExist(err) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"suggestions": []interface{}{},
			"message":     "No definition folder found. Please create capabilities first using the Capabilities page.",
		})
		return
	}

	// Read all CAP-*.md files from definition folder
	entries, err := os.ReadDir(definitionPath)
	if err != nil {
		http.Error(w, fmt.Sprintf("failed to read definition folder: %v", err), http.StatusInternalServerError)
		return
	}

	var allContent strings.Builder
	allContent.WriteString("# Capability Documents\n\n")
	allContent.WriteString("These documents represent the capabilities defined for the system. Analyze them to propose enablers.\n\n")

	fileCount := 0
	var capabilityNames []string
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		fileName := entry.Name()
		// Only process CAP-*.md files (capability files)
		if !strings.HasPrefix(strings.ToUpper(fileName), "CAP") || !strings.HasSuffix(strings.ToLower(fileName), ".md") {
			continue
		}

		filePath := filepath.Join(definitionPath, fileName)
		content, err := os.ReadFile(filePath)
		if err != nil {
			continue
		}

		// Extract capability name from content
		lines := strings.Split(string(content), "\n")
		capName := fileName
		for _, line := range lines {
			if strings.HasPrefix(line, "# ") {
				capName = strings.TrimPrefix(line, "# ")
				break
			}
		}
		capabilityNames = append(capabilityNames, capName)

		allContent.WriteString(fmt.Sprintf("---\n## Capability: %s (File: %s)\n\n", capName, fileName))
		allContent.WriteString(string(content))
		allContent.WriteString("\n\n")
		fileCount++
	}

	if fileCount == 0 {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"suggestions": []interface{}{},
			"message":     "No capability files (CAP-*.md) found in the definition folder. Please create capabilities first.",
		})
		return
	}

	// Build the prompt for Claude
	existingEnablersList := "None"
	if len(req.ExistingEnablers) > 0 {
		existingEnablersList = strings.Join(req.ExistingEnablers, ", ")
	}

	prompt := fmt.Sprintf(`You are an expert software architect using the INTENT (Scaled Agile With AI) methodology.

Analyze the following capability documents and propose enablers for each capability.

**Enabler Definition (INTENT):**
- Enablers are technical implementations that realize capabilities through specific functionality
- Each enabler should map to actual code components, services, or modules
- Enablers contain functional and non-functional requirements with testable acceptance criteria

**Your Task:**
1. Analyze each capability document to understand its business purpose and requirements
2. For each capability, propose 1-3 enablers that would implement it
3. Each enabler should be:
   - Technical in focus (describes HOW, not WHY)
   - Implementation-ready with enough detail for development
   - Testable with clear inputs/outputs
   - Mapped to specific technical components

**CAPABILITY DOCUMENTS:**
%s

**EXISTING ENABLERS TO AVOID DUPLICATING:**
%s

**RESPONSE FORMAT (JSON only, no markdown):**
{
  "suggestions": [
    {
      "name": "Enabler Name (use verb phrases like 'Handle Authentication', 'Process Payments')",
      "purpose": "One paragraph describing what this enabler does technically",
      "capabilityName": "Name of the parent capability this enabler belongs to",
      "capabilityId": "Filename of the capability (e.g., CAP-USER-MGMT-1.md)",
      "rationale": "Why this enabler is needed to realize the capability",
      "requirements": ["Suggested functional requirement 1", "Suggested functional requirement 2", "Suggested functional requirement 3"]
    }
  ],
  "analysis": {
    "totalCapabilities": %d,
    "analyzedCapabilities": %s,
    "coverageNotes": "Brief notes on coverage and any gaps identified"
  }
}

Provide ONLY valid JSON in your response, no additional text or markdown formatting.`,
		allContent.String(),
		existingEnablersList,
		fileCount,
		fmt.Sprintf(`["%s"]`, strings.Join(capabilityNames, `", "`)),
	)

	// Call Claude API
	requestBody := map[string]interface{}{
		"model":      "claude-sonnet-4-20250514",
		"max_tokens": 4096,
		"messages": []map[string]string{
			{
				"role":    "user",
				"content": prompt,
			},
		},
	}

	jsonBody, err := json.Marshal(requestBody)
	if err != nil {
		http.Error(w, fmt.Sprintf("failed to marshal request: %v", err), http.StatusInternalServerError)
		return
	}

	httpReq, err := http.NewRequest("POST", "https://api.anthropic.com/v1/messages", strings.NewReader(string(jsonBody)))
	if err != nil {
		http.Error(w, fmt.Sprintf("failed to create request: %v", err), http.StatusInternalServerError)
		return
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("x-api-key", req.AnthropicKey)
	httpReq.Header.Set("anthropic-version", "2023-06-01")

	client := &http.Client{Timeout: 120 * time.Second}
	resp, err := client.Do(httpReq)
	if err != nil {
		http.Error(w, fmt.Sprintf("failed to call Claude API: %v", err), http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		http.Error(w, fmt.Sprintf("Claude API error: %s", string(body)), resp.StatusCode)
		return
	}

	var claudeResp struct {
		Content []struct {
			Text string `json:"text"`
		} `json:"content"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&claudeResp); err != nil {
		http.Error(w, fmt.Sprintf("failed to decode Claude response: %v", err), http.StatusInternalServerError)
		return
	}

	if len(claudeResp.Content) == 0 {
		http.Error(w, "empty response from Claude", http.StatusInternalServerError)
		return
	}

	// Parse the JSON response from Claude
	responseText := claudeResp.Content[0].Text

	// Extract JSON from response (in case there's extra text)
	jsonStart := strings.Index(responseText, "{")
	jsonEnd := strings.LastIndex(responseText, "}")
	if jsonStart == -1 || jsonEnd == -1 {
		http.Error(w, "invalid JSON in Claude response", http.StatusInternalServerError)
		return
	}

	jsonStr := responseText[jsonStart : jsonEnd+1]

	// Return the raw JSON response
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(jsonStr))
}

// HandleSaveSpecifications handles POST /save-specifications
func (h *Handler) HandleSaveSpecifications(w http.ResponseWriter, r *http.Request) {
	var req SaveSpecificationsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.WorkspacePath == "" {
		http.Error(w, "workspacePath is required", http.StatusBadRequest)
		return
	}

	if len(req.Files) == 0 {
		http.Error(w, "files array is required", http.StatusBadRequest)
		return
	}

	// Determine target subfolder - default to "specifications" if not provided
	targetSubfolder := req.Subfolder
	if targetSubfolder == "" {
		targetSubfolder = "specifications"
	}

	// Construct path to workspace target folder
	// Handle both relative and absolute paths, and Docker volume mounts
	workspacePath := req.WorkspacePath

	// If path contains "workspaces/", extract the relative part
	// This handles absolute host paths when running inside Docker containers
	if idx := strings.Index(workspacePath, "workspaces/"); idx != -1 {
		workspacePath = workspacePath[idx:]
	}

	// Get current working directory
	cwd, err := os.Getwd()
	if err != nil {
		http.Error(w, fmt.Sprintf("failed to get working directory: %v", err), http.StatusInternalServerError)
		return
	}
	targetPath := filepath.Join(cwd, workspacePath, targetSubfolder)

	// Ensure target folder exists
	if err := os.MkdirAll(targetPath, 0755); err != nil {
		http.Error(w, fmt.Sprintf("failed to create %s folder: %v", targetSubfolder, err), http.StatusInternalServerError)
		return
	}

	// Save all files
	savedFiles := []string{}
	for _, file := range req.Files {
		if file.FileName == "" || file.Content == "" {
			continue
		}
		filePath := filepath.Join(targetPath, file.FileName)
		if err := os.WriteFile(filePath, []byte(file.Content), 0644); err != nil {
			http.Error(w, fmt.Sprintf("failed to write file %s: %v", file.FileName, err), http.StatusInternalServerError)
			return
		}
		savedFiles = append(savedFiles, fmt.Sprintf("%s/%s", targetSubfolder, file.FileName))
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": fmt.Sprintf("%d files saved successfully", len(savedFiles)),
		"files":   savedFiles,
	})
}

// DeleteSpecificationRequest represents a request to delete a specification file
type DeleteSpecificationRequest struct {
	Path          string `json:"path"`          // Legacy: full path
	WorkspacePath string `json:"workspacePath"` // New: workspace path
	FileName      string `json:"fileName"`      // New: file name
	Subfolder     string `json:"subfolder"`     // New: subfolder (e.g., "definition")
}

// HandleDeleteSpecification handles POST /delete-specification
func (h *Handler) HandleDeleteSpecification(w http.ResponseWriter, r *http.Request) {
	var req DeleteSpecificationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	var filePath string

	// Support both old format (path) and new format (workspacePath + fileName + subfolder)
	if req.WorkspacePath != "" && req.FileName != "" {
		// New format: construct path from components
		if req.Subfolder != "" {
			filePath = filepath.Join(req.WorkspacePath, req.Subfolder, req.FileName)
		} else {
			filePath = filepath.Join(req.WorkspacePath, req.FileName)
		}
	} else if req.Path != "" {
		// Legacy format: use path directly
		filePath = req.Path
	} else {
		http.Error(w, "path or (workspacePath + fileName) is required", http.StatusBadRequest)
		return
	}

	// Handle path translation for Docker environments
	// If path contains "workspaces/", extract the relative part
	if idx := strings.Index(filePath, "workspaces/"); idx != -1 {
		filePath = filePath[idx:]
	}

	// Get current working directory
	cwd, err := os.Getwd()
	if err != nil {
		http.Error(w, fmt.Sprintf("failed to get working directory: %v", err), http.StatusInternalServerError)
		return
	}

	// Construct absolute path
	absolutePath := filepath.Join(cwd, filePath)

	// Log the delete operation
	log.Printf("[DeleteSpecification] Attempting to delete: %s", absolutePath)

	// Verify the file exists
	if _, err := os.Stat(absolutePath); os.IsNotExist(err) {
		http.Error(w, fmt.Sprintf("file not found: %s", absolutePath), http.StatusNotFound)
		return
	}

	// Delete the file
	if err := os.Remove(absolutePath); err != nil {
		http.Error(w, fmt.Sprintf("failed to delete file: %v", err), http.StatusInternalServerError)
		return
	}

	log.Printf("[DeleteSpecification] Successfully deleted: %s", absolutePath)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "File deleted successfully",
		"path":    absolutePath,
	})
}

// ReadSpecificationRequest represents a request to read a specification file
type ReadSpecificationRequest struct {
	WorkspacePath string `json:"workspacePath"`
	Subfolder     string `json:"subfolder"`
	FileName      string `json:"fileName"`
}

// HandleReadSpecification handles POST /read-specification
func (h *Handler) HandleReadSpecification(w http.ResponseWriter, r *http.Request) {
	var req ReadSpecificationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.WorkspacePath == "" {
		http.Error(w, "workspacePath is required", http.StatusBadRequest)
		return
	}

	if req.FileName == "" {
		http.Error(w, "fileName is required", http.StatusBadRequest)
		return
	}

	// Determine target subfolder - default to "specifications" if not provided
	targetSubfolder := req.Subfolder
	if targetSubfolder == "" {
		targetSubfolder = "specifications"
	}

	// Handle path translation for Docker environments
	workspacePath := req.WorkspacePath

	// If path contains "workspaces/", extract the relative part
	if idx := strings.Index(workspacePath, "workspaces/"); idx != -1 {
		workspacePath = workspacePath[idx:]
	}

	// Get current working directory
	cwd, err := os.Getwd()
	if err != nil {
		http.Error(w, fmt.Sprintf("failed to get working directory: %v", err), http.StatusInternalServerError)
		return
	}

	// Construct absolute path to the file
	filePath := filepath.Join(cwd, workspacePath, targetSubfolder, req.FileName)

	// Verify the file exists
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		http.Error(w, "file not found", http.StatusNotFound)
		return
	}

	// Read the file
	content, err := os.ReadFile(filePath)
	if err != nil {
		http.Error(w, fmt.Sprintf("failed to read file: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":  true,
		"content":  string(content),
		"fileName": req.FileName,
	})
}

// ReadStoryboardFilesRequest represents a request to read storyboard files
type ReadStoryboardFilesRequest struct {
	WorkspacePath string `json:"workspacePath"`
}

// StoryboardFile represents a storyboard file with its content
type StoryboardFile struct {
	FileName string `json:"fileName"`
	Content  string `json:"content"`
}

// HandleReadStoryboardFiles handles POST /read-storyboard-files
// Reads all STORY-*.md files from the conception folder
func (h *Handler) HandleReadStoryboardFiles(w http.ResponseWriter, r *http.Request) {
	var req ReadStoryboardFilesRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.WorkspacePath == "" {
		http.Error(w, "workspacePath is required", http.StatusBadRequest)
		return
	}

	// Handle path translation for Docker environments
	workspacePath := req.WorkspacePath

	// If path contains "workspaces/", extract the relative part
	if idx := strings.Index(workspacePath, "workspaces/"); idx != -1 {
		workspacePath = workspacePath[idx:]
	}

	// Get current working directory
	cwd, err := os.Getwd()
	if err != nil {
		http.Error(w, fmt.Sprintf("failed to get working directory: %v", err), http.StatusInternalServerError)
		return
	}

	// Look in conception folder for STORY-*.md files
	conceptionPath := filepath.Join(cwd, workspacePath, "conception")

	// Check if conception folder exists
	if _, err := os.Stat(conceptionPath); os.IsNotExist(err) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
			"files":   []StoryboardFile{},
			"message": "No conception folder found",
		})
		return
	}

	// Read all files in the conception folder
	entries, err := os.ReadDir(conceptionPath)
	if err != nil {
		http.Error(w, fmt.Sprintf("failed to read conception folder: %v", err), http.StatusInternalServerError)
		return
	}

	var files []StoryboardFile

	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}

		fileName := entry.Name()

		// Process STORY-*.md files and SBSUP-INDEX-1.md (for connections data)
		isStoryFile := strings.HasPrefix(fileName, "STORY-") && strings.HasSuffix(fileName, ".md")
		isIndexFile := fileName == "SBSUP-INDEX-1.md"

		if !isStoryFile && !isIndexFile {
			continue
		}

		// Read file content
		filePath := filepath.Join(conceptionPath, fileName)
		content, err := os.ReadFile(filePath)
		if err != nil {
			continue // Skip files that can't be read
		}

		files = append(files, StoryboardFile{
			FileName: fileName,
			Content:  string(content),
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"files":   files,
		"count":   len(files),
	})
}

// ==================== EPIC FILES (INTENT Epics - Scaled Agile With AI) ====================

// FileEpic represents an epic parsed from a markdown file
type FileEpic struct {
	Filename        string            `json:"filename"`
	Path            string            `json:"path"`
	Name            string            `json:"name"`
	Description     string            `json:"description"`
	Status          string            `json:"status"`
	Content         string            `json:"content"`
	Fields          map[string]string `json:"fields"`
	UserValue       int               `json:"userValue"`
	TimeCriticality int               `json:"timeCriticality"`
	RiskReduction   int               `json:"riskReduction"`
	JobSize         int               `json:"jobSize"`
	WsjfScore       float64           `json:"wsjfScore"`
}

// EpicFilesRequest represents the request to list epic files
type EpicFilesRequest struct {
	WorkspacePath string `json:"workspacePath"`
}

// HandleEpicFiles handles POST /epic-files
func (h *Handler) HandleEpicFiles(w http.ResponseWriter, r *http.Request) {
	var req EpicFilesRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.WorkspacePath == "" {
		http.Error(w, "workspacePath is required", http.StatusBadRequest)
		return
	}

	// Epic files are stored in the definition folder
	specsPath := filepath.Join(req.WorkspacePath, "definition")

	if _, err := os.Stat(specsPath); os.IsNotExist(err) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"epics": []FileEpic{},
		})
		return
	}

	var epics []FileEpic

	err := filepath.Walk(specsPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil
		}

		if info.IsDir() {
			return nil
		}

		filename := info.Name()
		filenameUpper := strings.ToUpper(filename)

		// Match EPIC-*.md files
		if !strings.HasPrefix(filenameUpper, "EPIC") {
			return nil
		}

		if !strings.HasSuffix(strings.ToLower(filename), ".md") {
			return nil
		}

		content, err := os.ReadFile(path)
		if err != nil {
			return nil
		}

		epic := parseEpicMarkdown(filename, path, string(content))
		epics = append(epics, epic)

		return nil
	})

	if err != nil {
		http.Error(w, fmt.Sprintf("failed to scan specifications folder: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"epics": epics,
	})
}

// parseEpicMarkdown parses a markdown file to extract epic information
func parseEpicMarkdown(filename, path, content string) FileEpic {
	epic := FileEpic{
		Filename: filename,
		Path:     path,
		Content:  content,
		Fields:   make(map[string]string),
		Status:   "Funnel",
	}

	lines := strings.Split(content, "\n")
	var currentSection string
	var sectionContent []string

	for _, line := range lines {
		trimmedLine := strings.TrimSpace(line)

		// Extract title from # heading
		if strings.HasPrefix(trimmedLine, "# ") {
			epic.Name = strings.TrimPrefix(trimmedLine, "# ")
			continue
		}

		// Extract section headers
		if strings.HasPrefix(trimmedLine, "## ") {
			// Save previous section
			if currentSection != "" {
				epic.Fields[currentSection] = strings.TrimSpace(strings.Join(sectionContent, "\n"))
			}
			currentSection = strings.TrimPrefix(trimmedLine, "## ")
			sectionContent = []string{}
			continue
		}

		// Extract metadata fields
		if strings.HasPrefix(trimmedLine, "**Status:**") {
			epic.Status = strings.TrimSpace(strings.TrimPrefix(trimmedLine, "**Status:**"))
			continue
		}

		if strings.HasPrefix(trimmedLine, "**User Value:**") {
			val := strings.TrimSpace(strings.TrimPrefix(trimmedLine, "**User Value:**"))
			if v, err := strconv.Atoi(val); err == nil {
				epic.UserValue = v
			}
			continue
		}

		if strings.HasPrefix(trimmedLine, "**Time Criticality:**") {
			val := strings.TrimSpace(strings.TrimPrefix(trimmedLine, "**Time Criticality:**"))
			if v, err := strconv.Atoi(val); err == nil {
				epic.TimeCriticality = v
			}
			continue
		}

		if strings.HasPrefix(trimmedLine, "**Risk Reduction:**") {
			val := strings.TrimSpace(strings.TrimPrefix(trimmedLine, "**Risk Reduction:**"))
			if v, err := strconv.Atoi(val); err == nil {
				epic.RiskReduction = v
			}
			continue
		}

		if strings.HasPrefix(trimmedLine, "**Job Size:**") {
			val := strings.TrimSpace(strings.TrimPrefix(trimmedLine, "**Job Size:**"))
			if v, err := strconv.Atoi(val); err == nil {
				epic.JobSize = v
			}
			continue
		}

		// Collect section content
		if currentSection != "" {
			sectionContent = append(sectionContent, line)
		} else if epic.Description == "" && trimmedLine != "" && !strings.HasPrefix(trimmedLine, "**") {
			// First non-metadata paragraph is the description
			epic.Description = trimmedLine
		}
	}

	// Save last section
	if currentSection != "" {
		epic.Fields[currentSection] = strings.TrimSpace(strings.Join(sectionContent, "\n"))
	}

	// Calculate WSJF score
	if epic.JobSize > 0 {
		costOfDelay := float64(epic.UserValue + epic.TimeCriticality + epic.RiskReduction)
		epic.WsjfScore = costOfDelay / float64(epic.JobSize)
	}

	return epic
}

// SaveEpicRequest represents the request to save an epic file
type SaveEpicRequest struct {
	Path              string `json:"path"`
	Name              string `json:"name"`
	Description       string `json:"description"`
	Status            string `json:"status"`
	BusinessOutcome   string `json:"businessOutcome"`
	MvpDefinition     string `json:"mvpDefinition"`
	AcceptanceCriteria string `json:"acceptanceCriteria"`
	UserValue         int    `json:"userValue"`
	TimeCriticality   int    `json:"timeCriticality"`
	RiskReduction     int    `json:"riskReduction"`
	JobSize           int    `json:"jobSize"`
	Content           string `json:"content"`
}

// HandleSaveEpic handles POST /save-epic
func (h *Handler) HandleSaveEpic(w http.ResponseWriter, r *http.Request) {
	var req SaveEpicRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.Path == "" {
		http.Error(w, "path is required", http.StatusBadRequest)
		return
	}

	// Ensure parent directory exists
	dir := filepath.Dir(req.Path)
	if err := os.MkdirAll(dir, 0755); err != nil {
		http.Error(w, fmt.Sprintf("failed to create directory: %v", err), http.StatusInternalServerError)
		return
	}

	// Build markdown content
	var content strings.Builder
	content.WriteString(fmt.Sprintf("# %s\n\n", req.Name))

	// Metadata section
	content.WriteString("## Metadata\n")
	content.WriteString(fmt.Sprintf("**Status:** %s\n", req.Status))
	content.WriteString(fmt.Sprintf("**Generated:** %s\n\n", time.Now().Format("01/02/2006")))

	// WSJF section
	content.WriteString("## WSJF Scoring\n")
	content.WriteString(fmt.Sprintf("**User Value:** %d\n", req.UserValue))
	content.WriteString(fmt.Sprintf("**Time Criticality:** %d\n", req.TimeCriticality))
	content.WriteString(fmt.Sprintf("**Risk Reduction:** %d\n", req.RiskReduction))
	content.WriteString(fmt.Sprintf("**Job Size:** %d\n", req.JobSize))
	if req.JobSize > 0 {
		wsjf := float64(req.UserValue+req.TimeCriticality+req.RiskReduction) / float64(req.JobSize)
		content.WriteString(fmt.Sprintf("**WSJF Score:** %.1f\n\n", wsjf))
	} else {
		content.WriteString("**WSJF Score:** N/A\n\n")
	}

	// Description
	if req.Description != "" {
		content.WriteString("## Description\n")
		content.WriteString(req.Description + "\n\n")
	}

	// Business Outcome
	if req.BusinessOutcome != "" {
		content.WriteString("## Business Outcome\n")
		content.WriteString(req.BusinessOutcome + "\n\n")
	}

	// MVP Definition
	if req.MvpDefinition != "" {
		content.WriteString("## MVP Definition\n")
		content.WriteString(req.MvpDefinition + "\n\n")
	}

	// Acceptance Criteria
	if req.AcceptanceCriteria != "" {
		content.WriteString("## Acceptance Criteria\n")
		content.WriteString(req.AcceptanceCriteria + "\n\n")
	}

	// Additional content
	if req.Content != "" {
		content.WriteString("## Additional Notes\n")
		content.WriteString(req.Content + "\n")
	}

	if err := os.WriteFile(req.Path, []byte(content.String()), 0644); err != nil {
		http.Error(w, fmt.Sprintf("failed to save file: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Epic saved successfully",
	})
}

// DeleteEpicRequest represents the request to delete an epic file
type DeleteEpicRequest struct {
	Path string `json:"path"`
}

// HandleDeleteEpic handles POST /delete-epic
func (h *Handler) HandleDeleteEpic(w http.ResponseWriter, r *http.Request) {
	var req DeleteEpicRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.Path == "" {
		http.Error(w, "path is required", http.StatusBadRequest)
		return
	}

	if _, err := os.Stat(req.Path); os.IsNotExist(err) {
		http.Error(w, "file not found", http.StatusNotFound)
		return
	}

	if err := os.Remove(req.Path); err != nil {
		http.Error(w, fmt.Sprintf("failed to delete file: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Epic deleted successfully",
	})
}

// ==================== THEME FILES (INTENT Strategic Themes) ====================

// FileTheme represents a theme parsed from a markdown file
type FileTheme struct {
	Filename    string            `json:"filename"`
	Path        string            `json:"path"`
	Name        string            `json:"name"`
	Description string            `json:"description"`
	Status      string            `json:"status"`
	Content     string            `json:"content"`
	Fields      map[string]string `json:"fields"`
	ThemeType   string            `json:"themeType"` // vision, strategic-theme, market-context
}

// ThemeFilesRequest represents the request to list theme files
type ThemeFilesRequest struct {
	WorkspacePath string `json:"workspacePath"`
}

// HandleThemeFiles handles POST /theme-files
func (h *Handler) HandleThemeFiles(w http.ResponseWriter, r *http.Request) {
	var req ThemeFilesRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.WorkspacePath == "" {
		http.Error(w, "workspacePath is required", http.StatusBadRequest)
		return
	}

	// Theme files are stored in the conception folder
	// Handle both relative and absolute paths, and Docker volume mounts
	workspacePath := req.WorkspacePath

	// If path contains "workspaces/", extract the relative part
	if idx := strings.Index(workspacePath, "workspaces/"); idx != -1 {
		workspacePath = workspacePath[idx:]
	}

	// Get current working directory
	cwd, err := os.Getwd()
	if err != nil {
		http.Error(w, fmt.Sprintf("failed to get working directory: %v", err), http.StatusInternalServerError)
		return
	}
	specsPath := filepath.Join(cwd, workspacePath, "conception")

	if _, err := os.Stat(specsPath); os.IsNotExist(err) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"themes": []FileTheme{},
		})
		return
	}

	var themes []FileTheme

	err = filepath.Walk(specsPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil
		}

		if info.IsDir() {
			return nil
		}

		filename := info.Name()
		filenameUpper := strings.ToUpper(filename)

		// Match vision/theme files: VIS-*.md, STRAT-*.md, MKT-*.md (new format)
		// Also support legacy: THEME-*.md, VISION-*.md
		isThemeFile := strings.HasPrefix(filenameUpper, "VIS-") ||
			strings.HasPrefix(filenameUpper, "STRAT-") ||
			strings.HasPrefix(filenameUpper, "MKT-") ||
			strings.HasPrefix(filenameUpper, "THEME") ||
			strings.HasPrefix(filenameUpper, "VISION")
		if !isThemeFile {
			return nil
		}

		if !strings.HasSuffix(strings.ToLower(filename), ".md") {
			return nil
		}

		content, err := os.ReadFile(path)
		if err != nil {
			return nil
		}

		theme := parseThemeMarkdown(filename, path, string(content))
		themes = append(themes, theme)

		return nil
	})

	if err != nil {
		http.Error(w, fmt.Sprintf("failed to scan specifications folder: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"themes": themes,
	})
}

// parseThemeMarkdown parses a markdown file to extract theme information
func parseThemeMarkdown(filename, path, content string) FileTheme {
	theme := FileTheme{
		Filename:  filename,
		Path:      path,
		Content:   content,
		Fields:    make(map[string]string),
		ThemeType: "strategic-theme",
	}

	// Infer type from filename prefix
	filenameUpper := strings.ToUpper(filename)
	if strings.HasPrefix(filenameUpper, "VIS-") || strings.HasPrefix(filenameUpper, "VISION") {
		theme.ThemeType = "vision"
	} else if strings.HasPrefix(filenameUpper, "MKT-") {
		theme.ThemeType = "market-context"
	} else if strings.HasPrefix(filenameUpper, "STRAT-") || strings.HasPrefix(filenameUpper, "THEME") {
		theme.ThemeType = "strategic-theme"
	}

	lines := strings.Split(content, "\n")
	var currentSection string
	var sectionContent []string

	for _, line := range lines {
		trimmedLine := strings.TrimSpace(line)

		// Extract title from # heading
		if strings.HasPrefix(trimmedLine, "# ") {
			theme.Name = strings.TrimPrefix(trimmedLine, "# ")
			continue
		}

		// Extract section headers
		if strings.HasPrefix(trimmedLine, "## ") {
			// Save previous section
			if currentSection != "" {
				theme.Fields[currentSection] = strings.TrimSpace(strings.Join(sectionContent, "\n"))
			}
			currentSection = strings.TrimPrefix(trimmedLine, "## ")
			sectionContent = []string{}
			continue
		}

		// Extract metadata fields
		if strings.HasPrefix(trimmedLine, "**Type:**") {
			typeVal := strings.TrimSpace(strings.TrimPrefix(trimmedLine, "**Type:**"))
			// Map display names back to internal type names
			switch typeVal {
			case "Vision Statement":
				theme.ThemeType = "vision"
			case "Market Context":
				theme.ThemeType = "market-context"
			case "Strategic Theme":
				theme.ThemeType = "strategic-theme"
			default:
				theme.ThemeType = strings.ToLower(strings.ReplaceAll(typeVal, " ", "-"))
			}
			continue
		}

		if strings.HasPrefix(trimmedLine, "**Status:**") {
			theme.Status = strings.TrimSpace(strings.TrimPrefix(trimmedLine, "**Status:**"))
			continue
		}

		// Collect section content
		if currentSection != "" {
			sectionContent = append(sectionContent, line)
		} else if theme.Description == "" && trimmedLine != "" && !strings.HasPrefix(trimmedLine, "**") {
			theme.Description = trimmedLine
		}
	}

	// Save last section
	if currentSection != "" {
		theme.Fields[currentSection] = strings.TrimSpace(strings.Join(sectionContent, "\n"))
	}

	return theme
}

// SaveThemeRequest represents the request to save a theme file
type SaveThemeRequest struct {
	Path           string `json:"path"`
	Name           string `json:"name"`
	Description    string `json:"description"`
	ThemeType      string `json:"themeType"`
	TargetOutcomes string `json:"targetOutcomes"`
	KeyMetrics     string `json:"keyMetrics"`
	TimeHorizon    string `json:"timeHorizon"`
	Stakeholders   string `json:"stakeholders"`
	Content        string `json:"content"`
}

// HandleSaveTheme handles POST /save-theme
func (h *Handler) HandleSaveTheme(w http.ResponseWriter, r *http.Request) {
	var req SaveThemeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.Path == "" {
		http.Error(w, "path is required", http.StatusBadRequest)
		return
	}

	// Handle both relative and absolute paths, and Docker volume mounts
	filePath := req.Path

	// If path contains "workspaces/", extract the relative part and resolve from cwd
	if idx := strings.Index(filePath, "workspaces/"); idx != -1 {
		relativePath := filePath[idx:]
		cwd, err := os.Getwd()
		if err != nil {
			http.Error(w, fmt.Sprintf("failed to get working directory: %v", err), http.StatusInternalServerError)
			return
		}
		filePath = filepath.Join(cwd, relativePath)
	}

	// Ensure parent directory exists
	dir := filepath.Dir(filePath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		http.Error(w, fmt.Sprintf("failed to create directory: %v", err), http.StatusInternalServerError)
		return
	}

	// Format theme type for display
	themeTypeDisplay := "Strategic Theme"
	switch req.ThemeType {
	case "vision":
		themeTypeDisplay = "Vision Statement"
	case "market-context":
		themeTypeDisplay = "Market Context"
	}

	// Build markdown content
	var content strings.Builder
	content.WriteString(fmt.Sprintf("# %s\n\n", req.Name))

	// Metadata section
	content.WriteString("## Metadata\n")
	content.WriteString(fmt.Sprintf("**Type:** %s\n", themeTypeDisplay))
	content.WriteString(fmt.Sprintf("**Generated:** %s\n\n", time.Now().Format("01/02/2006")))

	// Description
	if req.Description != "" {
		content.WriteString("## Description\n")
		content.WriteString(req.Description + "\n\n")
	}

	// Target Outcomes
	if req.TargetOutcomes != "" {
		content.WriteString("## Target Outcomes\n")
		content.WriteString(req.TargetOutcomes + "\n\n")
	}

	// Key Metrics
	if req.KeyMetrics != "" {
		content.WriteString("## Key Metrics\n")
		content.WriteString(req.KeyMetrics + "\n\n")
	}

	// Time Horizon
	if req.TimeHorizon != "" {
		content.WriteString("## Time Horizon\n")
		content.WriteString(req.TimeHorizon + "\n\n")
	}

	// Stakeholders
	if req.Stakeholders != "" {
		content.WriteString("## Stakeholders\n")
		content.WriteString(req.Stakeholders + "\n\n")
	}

	// Additional content
	if req.Content != "" {
		content.WriteString("## Additional Notes\n")
		content.WriteString(req.Content + "\n")
	}

	if err := os.WriteFile(filePath, []byte(content.String()), 0644); err != nil {
		http.Error(w, fmt.Sprintf("failed to save file: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Theme saved successfully",
		"path":    filePath,
	})
}

// DeleteThemeRequest represents the request to delete a theme file
type DeleteThemeRequest struct {
	Path string `json:"path"`
}

// HandleDeleteTheme handles POST /delete-theme
func (h *Handler) HandleDeleteTheme(w http.ResponseWriter, r *http.Request) {
	var req DeleteThemeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.Path == "" {
		http.Error(w, "path is required", http.StatusBadRequest)
		return
	}

	// Handle both relative and absolute paths, and Docker volume mounts
	filePath := req.Path

	// If path contains "workspaces/", extract the relative part and resolve from cwd
	if idx := strings.Index(filePath, "workspaces/"); idx != -1 {
		relativePath := filePath[idx:]
		cwd, err := os.Getwd()
		if err != nil {
			http.Error(w, fmt.Sprintf("failed to get working directory: %v", err), http.StatusInternalServerError)
			return
		}
		filePath = filepath.Join(cwd, relativePath)
	}

	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		http.Error(w, "file not found", http.StatusNotFound)
		return
	}

	if err := os.Remove(filePath); err != nil {
		http.Error(w, fmt.Sprintf("failed to delete file: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Theme deleted successfully",
	})
}

// ==================== FEATURE FILES (INTENT Features - FEAT-*.md) ====================

// FileFeature represents a feature parsed from a markdown file
type FileFeature struct {
	Filename        string            `json:"filename"`
	Path            string            `json:"path"`
	Name            string            `json:"name"`
	Description     string            `json:"description"`
	Status          string            `json:"status"`
	Content         string            `json:"content"`
	Fields          map[string]string `json:"fields"`
	ParentEpic      string            `json:"parentEpic"`
	BenefitHypothesis string          `json:"benefitHypothesis"`
}

// FeatureFilesRequest represents the request to list feature files
type FeatureFilesRequest struct {
	WorkspacePath string `json:"workspacePath"`
}

// HandleFeatureFiles handles POST /feature-files
func (h *Handler) HandleFeatureFiles(w http.ResponseWriter, r *http.Request) {
	var req FeatureFilesRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.WorkspacePath == "" {
		http.Error(w, "workspacePath is required", http.StatusBadRequest)
		return
	}

	specsPath := filepath.Join(req.WorkspacePath, "specifications")

	if _, err := os.Stat(specsPath); os.IsNotExist(err) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"features": []FileFeature{},
		})
		return
	}

	var features []FileFeature

	err := filepath.Walk(specsPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil
		}

		if info.IsDir() {
			return nil
		}

		filename := info.Name()
		filenameUpper := strings.ToUpper(filename)

		// Match FEAT-*.md files
		if !strings.HasPrefix(filenameUpper, "FEAT") {
			return nil
		}

		if !strings.HasSuffix(strings.ToLower(filename), ".md") {
			return nil
		}

		content, err := os.ReadFile(path)
		if err != nil {
			return nil
		}

		feature := parseFeatureMarkdown(filename, path, string(content))
		features = append(features, feature)

		return nil
	})

	if err != nil {
		http.Error(w, fmt.Sprintf("failed to scan specifications folder: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"features": features,
	})
}

// parseFeatureMarkdown parses a markdown file to extract feature information
func parseFeatureMarkdown(filename, path, content string) FileFeature {
	feature := FileFeature{
		Filename: filename,
		Path:     path,
		Content:  content,
		Fields:   make(map[string]string),
		Status:   "Planned",
	}

	lines := strings.Split(content, "\n")
	var currentSection string
	var sectionContent []string

	for _, line := range lines {
		trimmedLine := strings.TrimSpace(line)

		// Extract title from # heading
		if strings.HasPrefix(trimmedLine, "# ") {
			feature.Name = strings.TrimPrefix(trimmedLine, "# ")
			continue
		}

		// Extract section headers
		if strings.HasPrefix(trimmedLine, "## ") {
			// Save previous section
			if currentSection != "" {
				feature.Fields[currentSection] = strings.TrimSpace(strings.Join(sectionContent, "\n"))
			}
			currentSection = strings.TrimPrefix(trimmedLine, "## ")
			sectionContent = []string{}
			continue
		}

		// Extract metadata fields
		if strings.HasPrefix(trimmedLine, "**Status:**") {
			feature.Status = strings.TrimSpace(strings.TrimPrefix(trimmedLine, "**Status:**"))
			continue
		}

		if strings.HasPrefix(trimmedLine, "**Parent Epic:**") {
			feature.ParentEpic = strings.TrimSpace(strings.TrimPrefix(trimmedLine, "**Parent Epic:**"))
			continue
		}

		// Collect section content
		if currentSection != "" {
			sectionContent = append(sectionContent, line)
		} else if feature.Description == "" && trimmedLine != "" && !strings.HasPrefix(trimmedLine, "**") {
			feature.Description = trimmedLine
		}
	}

	// Save last section
	if currentSection != "" {
		feature.Fields[currentSection] = strings.TrimSpace(strings.Join(sectionContent, "\n"))
	}

	// Extract benefit hypothesis from fields if present
	if bh, ok := feature.Fields["Benefit Hypothesis"]; ok {
		feature.BenefitHypothesis = bh
	}

	return feature
}

// SaveFeatureRequest represents the request to save a feature file
type SaveFeatureRequest struct {
	Path              string `json:"path"`
	Name              string `json:"name"`
	Description       string `json:"description"`
	Status            string `json:"status"`
	ParentEpic        string `json:"parentEpic"`
	BenefitHypothesis string `json:"benefitHypothesis"`
	AcceptanceCriteria string `json:"acceptanceCriteria"`
	Content           string `json:"content"`
}

// HandleSaveFeature handles POST /save-feature
func (h *Handler) HandleSaveFeature(w http.ResponseWriter, r *http.Request) {
	var req SaveFeatureRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.Path == "" {
		http.Error(w, "path is required", http.StatusBadRequest)
		return
	}

	// Ensure parent directory exists
	dir := filepath.Dir(req.Path)
	if err := os.MkdirAll(dir, 0755); err != nil {
		http.Error(w, fmt.Sprintf("failed to create directory: %v", err), http.StatusInternalServerError)
		return
	}

	// Build markdown content
	var content strings.Builder
	content.WriteString(fmt.Sprintf("# %s\n\n", req.Name))

	// Metadata section
	content.WriteString("## Metadata\n")
	content.WriteString(fmt.Sprintf("**Status:** %s\n", req.Status))
	if req.ParentEpic != "" {
		content.WriteString(fmt.Sprintf("**Parent Epic:** %s\n", req.ParentEpic))
	}
	content.WriteString(fmt.Sprintf("**Generated:** %s\n\n", time.Now().Format("01/02/2006")))

	// Description
	if req.Description != "" {
		content.WriteString("## Description\n")
		content.WriteString(req.Description + "\n\n")
	}

	// Benefit Hypothesis
	if req.BenefitHypothesis != "" {
		content.WriteString("## Benefit Hypothesis\n")
		content.WriteString(req.BenefitHypothesis + "\n\n")
	}

	// Acceptance Criteria
	if req.AcceptanceCriteria != "" {
		content.WriteString("## Acceptance Criteria\n")
		content.WriteString(req.AcceptanceCriteria + "\n\n")
	}

	// Additional content
	if req.Content != "" {
		content.WriteString("## Additional Notes\n")
		content.WriteString(req.Content + "\n")
	}

	if err := os.WriteFile(req.Path, []byte(content.String()), 0644); err != nil {
		http.Error(w, fmt.Sprintf("failed to save file: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Feature saved successfully",
	})
}

// DeleteFeatureRequest represents the request to delete a feature file
type DeleteFeatureRequest struct {
	Path string `json:"path"`
}

// HandleDeleteFeature handles POST /delete-feature
func (h *Handler) HandleDeleteFeature(w http.ResponseWriter, r *http.Request) {
	var req DeleteFeatureRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.Path == "" {
		http.Error(w, "path is required", http.StatusBadRequest)
		return
	}

	if _, err := os.Stat(req.Path); os.IsNotExist(err) {
		http.Error(w, "file not found", http.StatusNotFound)
		return
	}

	if err := os.Remove(req.Path); err != nil {
		http.Error(w, fmt.Sprintf("failed to delete file: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Feature deleted successfully",
	})
}

// WorkspaceConfig represents the configuration stored in .intentrworkspace file
type WorkspaceConfig struct {
	ID               string                 `json:"id"`
	Name             string                 `json:"name"`
	Description      string                 `json:"description,omitempty"`
	WorkspaceType    string                 `json:"workspaceType,omitempty"`
	FigmaTeamURL     string                 `json:"figmaTeamUrl,omitempty"`
	ProjectFolder    string                 `json:"projectFolder,omitempty"`
	ActiveAIPreset   int                    `json:"activeAIPreset,omitempty"`
	SelectedUIFramework string             `json:"selectedUIFramework,omitempty"`
	SelectedUILayout string                 `json:"selectedUILayout,omitempty"`
	OwnerID          string                 `json:"ownerId,omitempty"`
	OwnerName        string                 `json:"ownerName,omitempty"`
	IsShared         bool                   `json:"isShared"`
	CreatedAt        string                 `json:"createdAt"`
	UpdatedAt        string                 `json:"updatedAt"`
	Version          string                 `json:"version"`
	CustomSettings   map[string]interface{} `json:"customSettings,omitempty"`
}

// SaveWorkspaceConfigRequest represents the request to save workspace config
type SaveWorkspaceConfigRequest struct {
	Config WorkspaceConfig `json:"config"`
}

// HandleSaveWorkspaceConfig handles POST /workspace-config/save
// Creates or updates the .intentrworkspace file in the workspace folder
func (h *Handler) HandleSaveWorkspaceConfig(w http.ResponseWriter, r *http.Request) {
	var req SaveWorkspaceConfigRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.Config.ProjectFolder == "" {
		http.Error(w, "projectFolder is required", http.StatusBadRequest)
		return
	}

	// Ensure path is within workspaces directory for security
	if !strings.HasPrefix(req.Config.ProjectFolder, "workspaces") {
		http.Error(w, "projectFolder must be within workspaces directory", http.StatusBadRequest)
		return
	}

	// Set version if not provided
	if req.Config.Version == "" {
		req.Config.Version = "1.0"
	}

	// Ensure the workspace folder exists
	if err := os.MkdirAll(req.Config.ProjectFolder, 0755); err != nil {
		http.Error(w, fmt.Sprintf("failed to create workspace folder: %v", err), http.StatusInternalServerError)
		return
	}

	// Create the .intentrworkspace file path
	configPath := filepath.Join(req.Config.ProjectFolder, ".intentrworkspace")

	// Marshal config to JSON with pretty formatting
	configJSON, err := json.MarshalIndent(req.Config, "", "  ")
	if err != nil {
		http.Error(w, fmt.Sprintf("failed to marshal config: %v", err), http.StatusInternalServerError)
		return
	}

	// Write the config file
	if err := os.WriteFile(configPath, configJSON, 0644); err != nil {
		http.Error(w, fmt.Sprintf("failed to write config file: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"path":    configPath,
		"message": "Workspace configuration saved successfully",
	})
}

// ScannedWorkspace represents a workspace found by scanning folders
type ScannedWorkspace struct {
	FolderName string          `json:"folderName"`
	FolderPath string          `json:"folderPath"`
	Config     *WorkspaceConfig `json:"config,omitempty"`
	HasConfig  bool            `json:"hasConfig"`
}

// ScanWorkspacesResponse represents the response from scanning workspaces
type ScanWorkspacesResponse struct {
	Workspaces []ScannedWorkspace `json:"workspaces"`
	BasePath   string             `json:"basePath"`
}

// HandleScanWorkspaces handles GET /workspace-config/scan
// Scans the ./workspaces folder for subfolders with .intentrworkspace files
func (h *Handler) HandleScanWorkspaces(w http.ResponseWriter, r *http.Request) {
	basePath := "workspaces"

	// Check if workspaces folder exists
	if _, err := os.Stat(basePath); os.IsNotExist(err) {
		// Return empty list if folder doesn't exist
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(ScanWorkspacesResponse{
			Workspaces: []ScannedWorkspace{},
			BasePath:   basePath,
		})
		return
	}

	// Read directory entries
	entries, err := os.ReadDir(basePath)
	if err != nil {
		http.Error(w, fmt.Sprintf("failed to read workspaces directory: %v", err), http.StatusInternalServerError)
		return
	}

	var workspaces []ScannedWorkspace

	for _, entry := range entries {
		// Only process directories
		if !entry.IsDir() {
			continue
		}

		// Skip hidden directories (except we're looking for .intentrworkspace inside them)
		if strings.HasPrefix(entry.Name(), ".") {
			continue
		}

		folderPath := filepath.Join(basePath, entry.Name())
		configPath := filepath.Join(folderPath, ".intentrworkspace")

		scannedWorkspace := ScannedWorkspace{
			FolderName: entry.Name(),
			FolderPath: folderPath,
			HasConfig:  false,
		}

		// Check if .intentrworkspace file exists
		if _, err := os.Stat(configPath); err == nil {
			// Read and parse the config file
			configData, err := os.ReadFile(configPath)
			if err == nil {
				var config WorkspaceConfig
				if err := json.Unmarshal(configData, &config); err == nil {
					scannedWorkspace.Config = &config
					scannedWorkspace.HasConfig = true
				}
			}
		}

		workspaces = append(workspaces, scannedWorkspace)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(ScanWorkspacesResponse{
		Workspaces: workspaces,
		BasePath:   basePath,
	})
}

// HandleGetWorkspaceConfig handles GET /workspace-config/{folderPath}
// Reads the .intentrworkspace file from a specific folder
func (h *Handler) HandleGetWorkspaceConfig(w http.ResponseWriter, r *http.Request) {
	folderPath := r.URL.Query().Get("path")
	if folderPath == "" {
		http.Error(w, "path query parameter is required", http.StatusBadRequest)
		return
	}

	// Ensure path is within workspaces directory for security
	if !strings.HasPrefix(folderPath, "workspaces") {
		http.Error(w, "path must be within workspaces directory", http.StatusBadRequest)
		return
	}

	configPath := filepath.Join(folderPath, ".intentrworkspace")

	// Check if config file exists
	if _, err := os.Stat(configPath); os.IsNotExist(err) {
		http.Error(w, "workspace configuration file not found", http.StatusNotFound)
		return
	}

	// Read the config file
	configData, err := os.ReadFile(configPath)
	if err != nil {
		http.Error(w, fmt.Sprintf("failed to read config file: %v", err), http.StatusInternalServerError)
		return
	}

	var config WorkspaceConfig
	if err := json.Unmarshal(configData, &config); err != nil {
		http.Error(w, fmt.Sprintf("failed to parse config file: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(config)
}

// parseCapabilityFromContent extracts capability information from markdown content
func parseCapabilityFromContent(filename, content string) CapabilitySpec {
	cap := CapabilitySpec{
		Type:                 "Capability",
		Status:               "Planned",
		Enablers:             []string{},
		UpstreamDependencies: []string{},
		DownstreamImpacts:    []string{},
	}

	lines := strings.Split(content, "\n")

	// Extract name from first # heading
	for _, line := range lines {
		if strings.HasPrefix(line, "# ") {
			cap.Name = strings.TrimPrefix(line, "# ")
			cap.Name = strings.TrimSpace(cap.Name)
			break
		}
	}

	// If no heading found, use filename
	if cap.Name == "" {
		baseName := strings.TrimSuffix(filename, ".md")
		cap.Name = strings.ReplaceAll(baseName, "-", " ")
		cap.Name = strings.ReplaceAll(cap.Name, "_", " ")
	}

	// Extract metadata fields using regex
	idPattern := regexp.MustCompile(`\*\*ID\*\*:\s*(CAP-\d+)`)
	statusPattern := regexp.MustCompile(`\*\*Status\*\*:\s*(.+)`)
	namePattern := regexp.MustCompile(`\*\*Name\*\*:\s*(.+)`)

	if match := idPattern.FindStringSubmatch(content); len(match) > 1 {
		cap.ID = strings.TrimSpace(match[1])
	}

	if match := statusPattern.FindStringSubmatch(content); len(match) > 1 {
		cap.Status = strings.TrimSpace(match[1])
	}

	if match := namePattern.FindStringSubmatch(content); len(match) > 1 {
		cap.Name = strings.TrimSpace(match[1])
	}

	// If no ID found, generate from filename
	if cap.ID == "" {
		// Extract numeric part from filename like "123456-capability.md" or "CAP-123456.md"
		numPattern := regexp.MustCompile(`(\d{4,})`)
		if match := numPattern.FindStringSubmatch(filename); len(match) > 1 {
			cap.ID = "CAP-" + match[1]
		} else {
			// Fallback: generate a hash-based ID
			cap.ID = fmt.Sprintf("CAP-%06d", hashString(filename)%1000000)
		}
	}

	// Parse enablers table
	// Look for ## Enablers section and parse the table
	inEnablersSection := false
	inTable := false
	for _, line := range lines {
		trimmedLine := strings.TrimSpace(line)

		if strings.HasPrefix(trimmedLine, "## Enablers") {
			inEnablersSection = true
			continue
		}

		if inEnablersSection && strings.HasPrefix(trimmedLine, "##") && !strings.HasPrefix(trimmedLine, "## Enablers") {
			inEnablersSection = false
			continue
		}

		if inEnablersSection && strings.HasPrefix(trimmedLine, "|") {
			inTable = true
			// Skip header and separator rows
			if strings.Contains(trimmedLine, "---") || strings.Contains(strings.ToLower(trimmedLine), "| id") {
				continue
			}

			// Parse table row for enabler IDs
			parts := strings.Split(trimmedLine, "|")
			for _, part := range parts {
				part = strings.TrimSpace(part)
				if strings.HasPrefix(part, "ENB-") {
					cap.Enablers = append(cap.Enablers, part)
				}
			}
		} else if inTable && !strings.HasPrefix(trimmedLine, "|") {
			inTable = false
		}
	}

	// Parse upstream dependencies table
	inUpstreamSection := false
	for _, line := range lines {
		trimmedLine := strings.TrimSpace(line)

		if strings.Contains(trimmedLine, "Internal Upstream Dependency") || strings.Contains(trimmedLine, "Upstream Dependencies") {
			inUpstreamSection = true
			continue
		}

		if inUpstreamSection && strings.HasPrefix(trimmedLine, "###") && !strings.Contains(trimmedLine, "Upstream") {
			inUpstreamSection = false
			continue
		}

		if inUpstreamSection && strings.HasPrefix(trimmedLine, "|") {
			// Skip header and separator rows
			if strings.Contains(trimmedLine, "---") || strings.Contains(strings.ToLower(trimmedLine), "capability id") {
				continue
			}

			// Parse table row for capability IDs
			capIDPattern := regexp.MustCompile(`CAP-\d+`)
			matches := capIDPattern.FindAllString(trimmedLine, -1)
			cap.UpstreamDependencies = append(cap.UpstreamDependencies, matches...)
		}
	}

	// Parse downstream impacts table
	inDownstreamSection := false
	for _, line := range lines {
		trimmedLine := strings.TrimSpace(line)

		if strings.Contains(trimmedLine, "Internal Downstream Impact") || strings.Contains(trimmedLine, "Downstream Impacts") {
			inDownstreamSection = true
			continue
		}

		if inDownstreamSection && strings.HasPrefix(trimmedLine, "###") && !strings.Contains(trimmedLine, "Downstream") {
			inDownstreamSection = false
			continue
		}

		if inDownstreamSection && strings.HasPrefix(trimmedLine, "|") {
			// Skip header and separator rows
			if strings.Contains(trimmedLine, "---") || strings.Contains(strings.ToLower(trimmedLine), "capability id") {
				continue
			}

			// Parse table row for capability IDs
			capIDPattern := regexp.MustCompile(`CAP-\d+`)
			matches := capIDPattern.FindAllString(trimmedLine, -1)
			cap.DownstreamImpacts = append(cap.DownstreamImpacts, matches...)
		}
	}

	return cap
}

// parseEnablerFromContent extracts enabler information from markdown content
func parseEnablerFromContent(filename, content string) EnablerSpec {
	enb := EnablerSpec{
		Type:   "Enabler",
		Status: "Planned",
	}

	lines := strings.Split(content, "\n")

	// Extract name from first # heading
	for _, line := range lines {
		if strings.HasPrefix(line, "# ") {
			enb.Name = strings.TrimPrefix(line, "# ")
			enb.Name = strings.TrimSpace(enb.Name)
			break
		}
	}

	// If no heading found, use filename
	if enb.Name == "" {
		baseName := strings.TrimSuffix(filename, ".md")
		enb.Name = strings.ReplaceAll(baseName, "-", " ")
		enb.Name = strings.ReplaceAll(enb.Name, "_", " ")
	}

	// Extract metadata fields using regex
	idPattern := regexp.MustCompile(`\*\*ID\*\*:\s*(ENB-\d+)`)
	capIDPattern := regexp.MustCompile(`\*\*Capability ID\*\*:\s*(CAP-\d+)`)
	statusPattern := regexp.MustCompile(`\*\*Status\*\*:\s*(.+)`)
	namePattern := regexp.MustCompile(`\*\*Name\*\*:\s*(.+)`)

	if match := idPattern.FindStringSubmatch(content); len(match) > 1 {
		enb.ID = strings.TrimSpace(match[1])
	}

	if match := capIDPattern.FindStringSubmatch(content); len(match) > 1 {
		enb.CapabilityID = strings.TrimSpace(match[1])
	}

	if match := statusPattern.FindStringSubmatch(content); len(match) > 1 {
		enb.Status = strings.TrimSpace(match[1])
	}

	if match := namePattern.FindStringSubmatch(content); len(match) > 1 {
		enb.Name = strings.TrimSpace(match[1])
	}

	// If no ID found, generate from filename
	if enb.ID == "" {
		// Extract numeric part from filename like "654321-enabler.md" or "ENB-654321.md"
		numPattern := regexp.MustCompile(`(\d{4,})`)
		if match := numPattern.FindStringSubmatch(filename); len(match) > 1 {
			enb.ID = "ENB-" + match[1]
		} else {
			// Fallback: generate a hash-based ID
			enb.ID = fmt.Sprintf("ENB-%06d", hashString(filename)%1000000)
		}
	}

	return enb
}

// hashString creates a simple hash for generating fallback IDs
func hashString(s string) int {
	h := 0
	for _, c := range s {
		h = 31*h + int(c)
	}
	if h < 0 {
		h = -h
	}
	return h
}

// HandleFetchJiraEpics handles POST /fetch-jira-epics
// Fetches all Epics (and Sagas) from a Jira project
func (h *Handler) HandleFetchJiraEpics(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req FetchJiraEpicsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, fmt.Sprintf("Invalid request body: %v", err), http.StatusBadRequest)
		return
	}

	if req.ProjectKey == "" {
		http.Error(w, "project_key is required", http.StatusBadRequest)
		return
	}

	if req.Credentials == nil || len(req.Credentials) == 0 {
		http.Error(w, "credentials are required", http.StatusBadRequest)
		return
	}

	resp, err := FetchJiraEpics(r.Context(), req)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to fetch Jira epics: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

// ImportJiraEpicsRequest is the request to import Jira Epics as Capabilities
type ImportJiraEpicsRequest struct {
	WorkspacePath string            `json:"workspace_path"`
	ProjectKey    string            `json:"project_key"`
	Epics         []JiraEpic        `json:"epics"`
	Credentials   map[string]string `json:"credentials"`
}

// ImportJiraEpicsResponse is the response from importing Jira Epics
type ImportJiraEpicsResponse struct {
	Imported []struct {
		JiraKey      string `json:"jira_key"`
		CapabilityID string `json:"capability_id"`
		Filename     string `json:"filename"`
	} `json:"imported"`
	Errors []struct {
		JiraKey string `json:"jira_key"`
		Error   string `json:"error"`
	} `json:"errors"`
	TotalImported int `json:"total_imported"`
	TotalErrors   int `json:"total_errors"`
}

// HandleImportJiraEpics handles POST /import-jira-epics
// Imports selected Jira Epics as Capability specification files
func (h *Handler) HandleImportJiraEpics(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req ImportJiraEpicsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, fmt.Sprintf("Invalid request body: %v", err), http.StatusBadRequest)
		return
	}

	if req.WorkspacePath == "" {
		http.Error(w, "workspace_path is required", http.StatusBadRequest)
		return
	}

	if len(req.Epics) == 0 {
		http.Error(w, "at least one epic is required", http.StatusBadRequest)
		return
	}

	// Ensure definition directory exists
	defsDir := filepath.Join(req.WorkspacePath, "definition")
	if err := os.MkdirAll(defsDir, 0755); err != nil {
		http.Error(w, fmt.Sprintf("Failed to create definitions directory: %v", err), http.StatusInternalServerError)
		return
	}

	response := ImportJiraEpicsResponse{
		Imported: make([]struct {
			JiraKey      string `json:"jira_key"`
			CapabilityID string `json:"capability_id"`
			Filename     string `json:"filename"`
		}, 0),
		Errors: make([]struct {
			JiraKey string `json:"jira_key"`
			Error   string `json:"error"`
		}, 0),
	}

	for _, epic := range req.Epics {
		// Generate a unique capability ID
		capID := generateCapabilityID()

		// Map Jira status to INTENT status
		intentStatus := mapJiraStatusToINTENT(epic.Status)

		// Map Jira priority to INTENT priority
		intentPriority := mapJiraPriorityToINTENT(epic.Priority)

		// Create capability markdown content
		content := generateCapabilityMarkdown(capID, epic, intentStatus, intentPriority)

		// Generate filename (format: CAP-XXXXXX.md)
		filename := fmt.Sprintf("%s.md", capID)
		filePath := filepath.Join(defsDir, filename)

		// Check if file already exists
		if _, err := os.Stat(filePath); err == nil {
			response.Errors = append(response.Errors, struct {
				JiraKey string `json:"jira_key"`
				Error   string `json:"error"`
			}{
				JiraKey: epic.Key,
				Error:   fmt.Sprintf("File already exists: %s", filename),
			})
			continue
		}

		// Write the file
		if err := os.WriteFile(filePath, []byte(content), 0644); err != nil {
			response.Errors = append(response.Errors, struct {
				JiraKey string `json:"jira_key"`
				Error   string `json:"error"`
			}{
				JiraKey: epic.Key,
				Error:   fmt.Sprintf("Failed to write file: %v", err),
			})
			continue
		}

		response.Imported = append(response.Imported, struct {
			JiraKey      string `json:"jira_key"`
			CapabilityID string `json:"capability_id"`
			Filename     string `json:"filename"`
		}{
			JiraKey:      epic.Key,
			CapabilityID: capID,
			Filename:     filename,
		})
	}

	response.TotalImported = len(response.Imported)
	response.TotalErrors = len(response.Errors)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// generateCapabilityID generates a unique CAP-XXXXXX ID
func generateCapabilityID() string {
	// Use timestamp + random component for uniqueness
	now := time.Now()
	timeComponent := now.UnixNano() % 10000
	randomComponent := now.Nanosecond() % 100
	combined := (int(timeComponent)*100 + randomComponent) % 1000000
	return fmt.Sprintf("CAP-%06d", combined)
}

// mapJiraStatusToINTENT maps Jira status to INTENT capability status
func mapJiraStatusToINTENT(jiraStatus string) string {
	statusLower := strings.ToLower(jiraStatus)

	switch {
	case strings.Contains(statusLower, "done") || strings.Contains(statusLower, "complete"):
		return "Implemented"
	case strings.Contains(statusLower, "in progress") || strings.Contains(statusLower, "active"):
		return "In Implementation"
	case strings.Contains(statusLower, "review"):
		return "Ready for Design"
	case strings.Contains(statusLower, "backlog") || strings.Contains(statusLower, "to do"):
		return "Ready for Analysis"
	default:
		return "In Draft"
	}
}

// mapJiraPriorityToINTENT maps Jira priority to INTENT priority
func mapJiraPriorityToINTENT(jiraPriority string) string {
	priorityLower := strings.ToLower(jiraPriority)

	switch {
	case strings.Contains(priorityLower, "highest") || strings.Contains(priorityLower, "critical"):
		return "Critical"
	case strings.Contains(priorityLower, "high"):
		return "High"
	case strings.Contains(priorityLower, "low") || strings.Contains(priorityLower, "lowest"):
		return "Low"
	default:
		return "Medium"
	}
}

// generateCapabilityMarkdown generates the capability markdown content from a Jira Epic
func generateCapabilityMarkdown(capID string, epic JiraEpic, status, priority string) string {
	// Escape any markdown special characters in the description
	description := strings.ReplaceAll(epic.Description, "\n", "\n\n")

	// Format labels as comma-separated
	labels := strings.Join(epic.Labels, ", ")
	if labels == "" {
		labels = "None"
	}

	return fmt.Sprintf(`# %s

## Metadata
- **Name**: %s
- **Type**: Capability
- **ID**: %s
- **Owner**: Imported from Jira
- **Status**: %s
- **Approval**: Pending
- **Priority**: %s
- **Analysis Review**: Required
- **Jira Key**: %s
- **Jira URL**: %s
- **Labels**: %s

## Business Context

### Problem Statement
%s

### Value Proposition
[Define the value proposition for this capability]

### Success Metrics
- [Metric 1]
- [Metric 2]

## User Perspective

### Primary Persona
[Define the primary user persona]

### User Journey (Before/After)
**Before**: [Current experience]
**After**: [Improved experience with this capability]

### User Scenarios
1. [Scenario 1]
2. [Scenario 2]

## Boundaries

### In Scope
- [What IS included]

### Out of Scope
- [What is NOT included]

### Assumptions
- Imported from Jira Epic: %s

### Constraints
- [Technical, business, or regulatory limits]

## Enablers
| ID | Name | Purpose | State |
|----|------|---------|-------|
| | | | |

## Dependencies

### Internal Upstream Dependency
| Capability ID | Description |
|---------------|-------------|
| | |

### Internal Downstream Impact
| Capability ID | Description |
|---------------|-------------|
| | |

## Acceptance Criteria
- [ ] [Specific, testable criterion]

## Technical Specifications (Template)

### Capability Dependency Flow Diagram
[To be defined during Design phase]

## Design Artifacts
- [Link to Figma/design files]

## Approval History
| Date | Stage | Decision | By | Feedback |
|------|-------|----------|-----|----------|
| %s | Import | Created | System | Imported from Jira Epic %s |
`,
		epic.Summary,                              // Title
		epic.Summary,                              // Name in metadata
		capID,                                     // ID
		status,                                    // Status
		priority,                                  // Priority
		epic.Key,                                  // Jira Key
		epic.URL,                                  // Jira URL
		labels,                                    // Labels
		description,                               // Problem Statement / Description
		epic.Key,                                  // Assumptions - Jira Key reference
		time.Now().Format("2006-01-02"),           // Approval History date
		epic.Key,                                  // Approval History - Jira key
	)
}
