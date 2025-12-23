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
	"strings"
)

// IntegrationResource represents a resource from an integration (project, file, repo, etc.)
type IntegrationResource struct {
	ID          string                 `json:"id"`
	Name        string                 `json:"name"`
	Type        string                 `json:"type"` // 'project', 'file', 'repo', etc.
	Description string                 `json:"description,omitempty"`
	URL         string                 `json:"url,omitempty"`
	Parent      string                 `json:"parent,omitempty"` // Parent resource ID (e.g., project ID for a file)
	Metadata    map[string]interface{} `json:"metadata,omitempty"`
	Children    []IntegrationResource  `json:"children,omitempty"`
}

// FetchResourcesRequest represents the request to fetch integration resources
type FetchResourcesRequest struct {
	IntegrationName string            `json:"integration_name"`
	Credentials     map[string]string `json:"credentials"` // API keys, tokens, etc.
	ResourceType    string            `json:"resource_type,omitempty"` // Optional: specific resource type to fetch
	ParentID        string            `json:"parent_id,omitempty"` // Optional: fetch children of a specific resource
}

// FetchResourcesResponse represents the response containing integration resources
type FetchResourcesResponse struct {
	IntegrationName string                  `json:"integration_name"`
	Resources       []IntegrationResource   `json:"resources"`
	Metadata        map[string]interface{}  `json:"metadata,omitempty"`
}

// FetchFilesRequest represents the request to fetch files from a specific resource
type FetchFilesRequest struct {
	IntegrationName string            `json:"integration_name"`
	ResourceID      string            `json:"resource_id"`
	ResourceType    string            `json:"resource_type"`
	Credentials     map[string]string `json:"credentials"`
}

// IntegrationFile represents a file/asset from an integration
type IntegrationFile struct {
	ID          string                 `json:"id"`
	Name        string                 `json:"name"`
	Type        string                 `json:"type"` // 'file', 'image', 'document', etc.
	URL         string                 `json:"url"`
	ThumbnailURL string                `json:"thumbnail_url,omitempty"`
	Size        int64                  `json:"size,omitempty"`
	CreatedAt   string                 `json:"created_at,omitempty"`
	UpdatedAt   string                 `json:"updated_at,omitempty"`
	Metadata    map[string]interface{} `json:"metadata,omitempty"`
}

// FetchFilesResponse represents the response containing files from a resource
type FetchFilesResponse struct {
	IntegrationName string              `json:"integration_name"`
	ResourceID      string              `json:"resource_id"`
	ResourceName    string              `json:"resource_name"`
	Files           []IntegrationFile   `json:"files"`
}

// FetchFileMetaRequest represents the request to fetch file metadata
type FetchFileMetaRequest struct {
	IntegrationName string            `json:"integration_name"`
	FileKey         string            `json:"file_key"`
	Credentials     map[string]string `json:"credentials"`
}

// FetchResources fetches available resources from an integration using provided credentials
func FetchResources(ctx context.Context, req FetchResourcesRequest) (*FetchResourcesResponse, error) {
	switch req.IntegrationName {
	case "Figma API", "Figma":
		return fetchFigmaResources(ctx, req)
	case "GitHub":
		return fetchGitHubResources(ctx, req)
	case "Jira":
		return fetchJiraResources(ctx, req)
	default:
		return nil, fmt.Errorf("unsupported integration: %s", req.IntegrationName)
	}
}

// extractFigmaTeamID parses the team ID from a Figma URL
// Expected format: https://www.figma.com/files/team/TEAM_ID/...
func extractFigmaTeamID(url string) (string, error) {
	// Find "/team/" in the URL
	teamPrefix := "/team/"
	teamIndex := strings.Index(url, teamPrefix)
	if teamIndex == -1 {
		return "", fmt.Errorf("URL does not contain '/team/' - expected format: https://www.figma.com/files/team/TEAM_ID/...")
	}

	// Start after "/team/"
	startIndex := teamIndex + len(teamPrefix)

	// Find the next "/" or end of string
	remainingURL := url[startIndex:]
	endIndex := strings.Index(remainingURL, "/")

	var teamID string
	if endIndex == -1 {
		// No trailing slash, take everything to the end
		teamID = remainingURL
	} else {
		// Take up to the next slash
		teamID = remainingURL[:endIndex]
	}

	// Trim whitespace and validate not empty
	teamID = strings.TrimSpace(teamID)
	if teamID == "" {
		return "", fmt.Errorf("team ID is empty in URL")
	}

	return teamID, nil
}

// fetchFigmaResources fetches projects and files from Figma
func fetchFigmaResources(ctx context.Context, req FetchResourcesRequest) (*FetchResourcesResponse, error) {
	accessToken, ok := req.Credentials["access_token"]
	if !ok {
		return nil, fmt.Errorf("access_token not found in credentials")
	}

	// Check if team_url is provided in credentials
	teamURL, hasTeamURL := req.Credentials["team_url"]

	var resources []IntegrationResource
	var metadata map[string]interface{}

	if hasTeamURL && teamURL != "" {
		// Parse team ID from URL
		teamID, err := extractFigmaTeamID(teamURL)
		if err != nil {
			return nil, fmt.Errorf("failed to parse team ID from URL: %w", err)
		}

		// Fetch team projects using the parsed team ID
		projectsURL := fmt.Sprintf("https://api.figma.com/v1/teams/%s/projects", teamID)
		httpReq, err := http.NewRequestWithContext(ctx, "GET", projectsURL, nil)
		if err != nil {
			return nil, err
		}
		httpReq.Header.Set("X-Figma-Token", accessToken)

		client := &http.Client{}
		resp, err := client.Do(httpReq)
		if err != nil {
			return nil, fmt.Errorf("failed to fetch Figma team projects: %w", err)
		}
		defer resp.Body.Close()

		// Read response body for debugging
		body, _ := io.ReadAll(resp.Body)

		fmt.Printf("DEBUG: Figma API URL: %s\n", projectsURL)
		fmt.Printf("DEBUG: Figma API Status: %d\n", resp.StatusCode)
		fmt.Printf("DEBUG: Figma API Response: %s\n", string(body))

		if resp.StatusCode != http.StatusOK {
			return nil, fmt.Errorf("Figma API error (%d): %s", resp.StatusCode, string(body))
		}

		var projectsResponse struct {
			Projects []struct {
				ID   string `json:"id"`
				Name string `json:"name"`
			} `json:"projects"`
		}

		if err := json.Unmarshal(body, &projectsResponse); err != nil {
			fmt.Printf("DEBUG: Failed to parse JSON: %v\n", err)
			return nil, fmt.Errorf("failed to decode projects response: %w", err)
		}

		fmt.Printf("DEBUG: Parsed %d projects\n", len(projectsResponse.Projects))

		// Convert projects to resources
		resources = make([]IntegrationResource, len(projectsResponse.Projects))
		for i, project := range projectsResponse.Projects {
			resources[i] = IntegrationResource{
				ID:          project.ID,
				Name:        project.Name,
				Type:        "project",
				Description: fmt.Sprintf("Figma project in team %s", teamID),
				Metadata: map[string]interface{}{
					"team_id": teamID,
				},
			}
		}

		metadata = map[string]interface{}{
			"team_id":       teamID,
			"team_url":      teamURL,
			"projects_count": len(resources),
		}
	} else {
		// No team URL provided, return user info as before
		httpReq, err := http.NewRequestWithContext(ctx, "GET", "https://api.figma.com/v1/me", nil)
		if err != nil {
			return nil, err
		}
		httpReq.Header.Set("X-Figma-Token", accessToken)

		client := &http.Client{}
		resp, err := client.Do(httpReq)
		if err != nil {
			return nil, fmt.Errorf("failed to fetch Figma user info: %w", err)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			body, _ := io.ReadAll(resp.Body)
			return nil, fmt.Errorf("Figma API error (%d): %s", resp.StatusCode, string(body))
		}

		var userInfo struct {
			ID     string `json:"id"`
			Email  string `json:"email"`
			Handle string `json:"handle"`
		}
		if err := json.NewDecoder(resp.Body).Decode(&userInfo); err != nil {
			return nil, err
		}

		resources = []IntegrationResource{
			{
				ID:          userInfo.ID,
				Name:        fmt.Sprintf("%s's Figma", userInfo.Handle),
				Type:        "user",
				Description: userInfo.Email,
				Metadata: map[string]interface{}{
					"email":  userInfo.Email,
					"handle": userInfo.Handle,
				},
			},
		}

		metadata = map[string]interface{}{
			"user_id": userInfo.ID,
			"note":    "Add 'team_url' to credentials to fetch team projects. Example: https://www.figma.com/files/team/TEAM_ID/Team-Name",
		}
	}

	return &FetchResourcesResponse{
		IntegrationName: "Figma API",
		Resources:       resources,
		Metadata:        metadata,
	}, nil
}

// fetchGitHubResources fetches repositories from GitHub
func fetchGitHubResources(ctx context.Context, req FetchResourcesRequest) (*FetchResourcesResponse, error) {
	accessToken, ok := req.Credentials["access_token"]
	if !ok {
		// Try alternative field names
		if token, exists := req.Credentials["API Key"]; exists {
			accessToken = token
		} else {
			return nil, fmt.Errorf("access_token not found in credentials")
		}
	}

	// GitHub API: List user repositories
	httpReq, err := http.NewRequestWithContext(ctx, "GET", "https://api.github.com/user/repos?per_page=100&sort=updated", nil)
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("Authorization", fmt.Sprintf("Bearer %s", accessToken))
	httpReq.Header.Set("Accept", "application/vnd.github.v3+json")

	client := &http.Client{}
	resp, err := client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch GitHub repositories: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("GitHub API error (%d): %s", resp.StatusCode, string(body))
	}

	var repos []struct {
		ID          int    `json:"id"`
		Name        string `json:"name"`
		FullName    string `json:"full_name"`
		Description string `json:"description"`
		HTMLURL     string `json:"html_url"`
		Private     bool   `json:"private"`
		Language    string `json:"language"`
		UpdatedAt   string `json:"updated_at"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&repos); err != nil {
		return nil, err
	}

	resources := make([]IntegrationResource, len(repos))
	for i, repo := range repos {
		resources[i] = IntegrationResource{
			ID:          fmt.Sprintf("%d", repo.ID),
			Name:        repo.FullName,
			Type:        "repository",
			Description: repo.Description,
			URL:         repo.HTMLURL,
			Metadata: map[string]interface{}{
				"private":    repo.Private,
				"language":   repo.Language,
				"updated_at": repo.UpdatedAt,
			},
		}
	}

	return &FetchResourcesResponse{
		IntegrationName: "GitHub",
		Resources:       resources,
	}, nil
}

// getCredential looks for a credential value using multiple possible field names
func getCredential(credentials map[string]string, fieldNames ...string) (string, bool) {
	for _, name := range fieldNames {
		if val, ok := credentials[name]; ok && val != "" {
			return val, true
		}
	}
	return "", false
}

// getCredentialKeys returns all keys in the credentials map for debugging
func getCredentialKeys(credentials map[string]string) []string {
	keys := make([]string, 0, len(credentials))
	for k := range credentials {
		keys = append(keys, k)
	}
	return keys
}

// fetchJiraResources fetches projects and issues from Jira
func fetchJiraResources(ctx context.Context, req FetchResourcesRequest) (*FetchResourcesResponse, error) {
	// Jira typically uses email + API token or OAuth
	// Support multiple field name variations that the LLM might return
	apiToken, ok := getCredential(req.Credentials, "api_token", "access_token", "token", "api_key", "apiToken", "accessToken")
	if !ok {
		return nil, fmt.Errorf("API token not found in credentials. Expected one of: api_token, access_token, token, api_key. Got fields: %v", getCredentialKeys(req.Credentials))
	}

	email, ok := getCredential(req.Credentials, "email", "username", "user", "user_email", "userEmail")
	if !ok {
		return nil, fmt.Errorf("email not found in credentials. Expected one of: email, username, user. Got fields: %v", getCredentialKeys(req.Credentials))
	}

	domain, ok := getCredential(req.Credentials, "domain", "site", "site_url", "siteUrl", "jira_domain", "jiraDomain", "host", "instance", "base_url", "baseUrl")
	if !ok {
		return nil, fmt.Errorf("domain not found in credentials (e.g., yourcompany.atlassian.net). Expected one of: domain, site, site_url, base_url. Got fields: %v", getCredentialKeys(req.Credentials))
	}

	// Clean up domain - remove protocol if present
	domain = strings.TrimPrefix(domain, "https://")
	domain = strings.TrimPrefix(domain, "http://")
	domain = strings.TrimSuffix(domain, "/")

	// Jira API: List projects
	url := fmt.Sprintf("https://%s/rest/api/3/project", domain)
	httpReq, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, err
	}
	httpReq.SetBasicAuth(email, apiToken)
	httpReq.Header.Set("Accept", "application/json")

	client := &http.Client{}
	resp, err := client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch Jira projects: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("Jira API error (%d): %s", resp.StatusCode, string(body))
	}

	var projects []struct {
		ID             string `json:"id"`
		Key            string `json:"key"`
		Name           string `json:"name"`
		Description    string `json:"description"`
		ProjectTypeKey string `json:"projectTypeKey"` // Jira returns this as a string, not an object
	}

	if err := json.NewDecoder(resp.Body).Decode(&projects); err != nil {
		return nil, err
	}

	resources := make([]IntegrationResource, len(projects))
	for i, project := range projects {
		resources[i] = IntegrationResource{
			ID:          project.ID,
			Name:        fmt.Sprintf("%s - %s", project.Key, project.Name),
			Type:        "project",
			Description: project.Description,
			URL:         fmt.Sprintf("https://%s/browse/%s", domain, project.Key),
			Metadata: map[string]interface{}{
				"key":          project.Key,
				"project_type": project.ProjectTypeKey,
			},
		}
	}

	return &FetchResourcesResponse{
		IntegrationName: "Jira",
		Resources:       resources,
	}, nil
}

// FetchFiles fetches files/assets from a specific resource
func FetchFiles(ctx context.Context, req FetchFilesRequest) (*FetchFilesResponse, error) {
	switch req.IntegrationName {
	case "Figma API", "Figma":
		return fetchFigmaFiles(ctx, req)
	case "GitHub":
		return fetchGitHubFiles(ctx, req)
	case "Jira":
		return fetchJiraFiles(ctx, req)
	default:
		return nil, fmt.Errorf("unsupported integration: %s", req.IntegrationName)
	}
}

// fetchFigmaFiles fetches files from a Figma project
func fetchFigmaFiles(ctx context.Context, req FetchFilesRequest) (*FetchFilesResponse, error) {
	accessToken, ok := req.Credentials["access_token"]
	if !ok {
		return nil, fmt.Errorf("access_token not found in credentials")
	}

	// The resource_id should be a project ID from fetchFigmaResources
	projectID := req.ResourceID
	if projectID == "" {
		return nil, fmt.Errorf("project_id is required")
	}

	// Fetch files from the project using Figma API
	filesURL := fmt.Sprintf("https://api.figma.com/v1/projects/%s/files", projectID)
	httpReq, err := http.NewRequestWithContext(ctx, "GET", filesURL, nil)
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("X-Figma-Token", accessToken)

	client := &http.Client{}
	resp, err := client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch Figma project files: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("Figma API error (%d): %s", resp.StatusCode, string(body))
	}

	var filesResponse struct {
		Files []struct {
			Key          string `json:"key"`
			Name         string `json:"name"`
			ThumbnailURL string `json:"thumbnail_url"`
			LastModified string `json:"last_modified"`
		} `json:"files"`
	}

	if err := json.Unmarshal(body, &filesResponse); err != nil {
		return nil, fmt.Errorf("failed to decode files response: %w", err)
	}

	// Convert to IntegrationFile format and fetch thumbnails
	files := make([]IntegrationFile, len(filesResponse.Files))
	for i, file := range filesResponse.Files {
		thumbnailURL := file.ThumbnailURL

		// If thumbnail_url is not provided by the /projects endpoint,
		// fetch it from the /files/:key/meta endpoint
		if thumbnailURL == "" {
			metaURL := fmt.Sprintf("https://api.figma.com/v1/files/%s/meta", file.Key)
			metaReq, err := http.NewRequestWithContext(ctx, "GET", metaURL, nil)
			if err == nil {
				metaReq.Header.Set("X-Figma-Token", accessToken)
				metaResp, err := client.Do(metaReq)
				if err == nil {
					defer metaResp.Body.Close()
					if metaResp.StatusCode == http.StatusOK {
						var metaResponse struct {
							ThumbnailURL string `json:"thumbnail_url"`
						}
						metaBody, _ := io.ReadAll(metaResp.Body)
						if json.Unmarshal(metaBody, &metaResponse) == nil {
							thumbnailURL = metaResponse.ThumbnailURL
						}
					}
				}
			}
		}

		files[i] = IntegrationFile{
			ID:           file.Key,
			Name:         file.Name,
			Type:         "figma-file",
			URL:          fmt.Sprintf("https://www.figma.com/file/%s", file.Key),
			ThumbnailURL: thumbnailURL,
			UpdatedAt:    file.LastModified,
			Metadata: map[string]interface{}{
				"file_key":   file.Key,
				"project_id": projectID,
			},
		}
	}

	return &FetchFilesResponse{
		IntegrationName: "Figma API",
		ResourceID:      projectID,
		ResourceName:    fmt.Sprintf("Project %s", projectID),
		Files:           files,
	}, nil
}

// fetchGitHubFiles fetches files from a GitHub repository
func fetchGitHubFiles(ctx context.Context, req FetchFilesRequest) (*FetchFilesResponse, error) {
	accessToken, ok := req.Credentials["access_token"]
	if !ok {
		if token, exists := req.Credentials["API Key"]; exists {
			accessToken = token
		} else {
			return nil, fmt.Errorf("access_token not found in credentials")
		}
	}

	// Get repo info from resource_id (it's the repo ID)
	// First, get repo details
	url := fmt.Sprintf("https://api.github.com/repositories/%s", req.ResourceID)
	httpReq, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("Authorization", fmt.Sprintf("Bearer %s", accessToken))
	httpReq.Header.Set("Accept", "application/vnd.github.v3+json")

	client := &http.Client{}
	resp, err := client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch GitHub repo: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("GitHub API error (%d): %s", resp.StatusCode, string(body))
	}

	var repo struct {
		ID       int    `json:"id"`
		FullName string `json:"full_name"`
		HTMLURL  string `json:"html_url"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&repo); err != nil {
		return nil, err
	}

	// Get contents of the repo root
	contentsURL := fmt.Sprintf("https://api.github.com/repos/%s/contents", repo.FullName)
	httpReq, err = http.NewRequestWithContext(ctx, "GET", contentsURL, nil)
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("Authorization", fmt.Sprintf("Bearer %s", accessToken))
	httpReq.Header.Set("Accept", "application/vnd.github.v3+json")

	resp, err = client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch GitHub contents: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("GitHub API error (%d): %s", resp.StatusCode, string(body))
	}

	var contents []struct {
		Name        string `json:"name"`
		Path        string `json:"path"`
		Type        string `json:"type"`
		Size        int64  `json:"size"`
		HTMLURL     string `json:"html_url"`
		DownloadURL string `json:"download_url"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&contents); err != nil {
		return nil, err
	}

	files := make([]IntegrationFile, 0, len(contents))
	for _, content := range contents {
		if content.Type == "file" {
			files = append(files, IntegrationFile{
				ID:   content.Path,
				Name: content.Name,
				Type: "file",
				URL:  content.HTMLURL,
				Size: content.Size,
				Metadata: map[string]interface{}{
					"path":         content.Path,
					"download_url": content.DownloadURL,
				},
			})
		}
	}

	return &FetchFilesResponse{
		IntegrationName: "GitHub",
		ResourceID:      req.ResourceID,
		ResourceName:    repo.FullName,
		Files:           files,
	}, nil
}

// FetchFileMeta fetches metadata for a specific file (for refreshing thumbnails)
func FetchFileMeta(ctx context.Context, req FetchFileMetaRequest) (map[string]interface{}, error) {
	switch req.IntegrationName {
	case "Figma API", "Figma":
		return fetchFigmaFileMeta(ctx, req)
	default:
		return nil, fmt.Errorf("unsupported integration: %s", req.IntegrationName)
	}
}

// fetchFigmaFileMeta fetches metadata for a specific Figma file
func fetchFigmaFileMeta(ctx context.Context, req FetchFileMetaRequest) (map[string]interface{}, error) {
	accessToken, ok := req.Credentials["access_token"]
	if !ok {
		return nil, fmt.Errorf("access_token not found in credentials")
	}

	// Fetch file metadata using Figma API
	metaURL := fmt.Sprintf("https://api.figma.com/v1/files/%s", req.FileKey)
	fmt.Printf("DEBUG [fetchFigmaFileMeta]: Fetching metadata from: %s\n", metaURL)

	httpReq, err := http.NewRequestWithContext(ctx, "GET", metaURL, nil)
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("X-Figma-Token", accessToken)

	client := &http.Client{}
	resp, err := client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch Figma file metadata: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	fmt.Printf("DEBUG [fetchFigmaFileMeta]: Status: %d\n", resp.StatusCode)
	fmt.Printf("DEBUG [fetchFigmaFileMeta]: Response (first 500 chars): %s\n", string(body[:min(500, len(body))]))

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("Figma API error (%d): %s", resp.StatusCode, string(body))
	}

	var metaResponse map[string]interface{}
	if err := json.Unmarshal(body, &metaResponse); err != nil {
		return nil, fmt.Errorf("failed to decode metadata response: %w", err)
	}

	// Extract thumbnailUrl from the response
	result := make(map[string]interface{})
	if thumbnailUrl, ok := metaResponse["thumbnailUrl"].(string); ok {
		result["thumbnail_url"] = thumbnailUrl
		fmt.Printf("DEBUG [fetchFigmaFileMeta]: Found thumbnailUrl: %s\n", thumbnailUrl)
	} else {
		fmt.Printf("DEBUG [fetchFigmaFileMeta]: thumbnailUrl not found in response, keys: %v\n", getKeys(metaResponse))
	}

	return result, nil
}

func getKeys(m map[string]interface{}) []string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	return keys
}

// fetchJiraFiles fetches issues/attachments from a Jira project
func fetchJiraFiles(ctx context.Context, req FetchFilesRequest) (*FetchFilesResponse, error) {
	// Support multiple field name variations that the LLM might return
	apiToken, ok := getCredential(req.Credentials, "api_token", "access_token", "token", "api_key", "apiToken", "accessToken")
	if !ok {
		return nil, fmt.Errorf("API token not found in credentials. Expected one of: api_token, access_token, token, api_key. Got fields: %v", getCredentialKeys(req.Credentials))
	}

	email, ok := getCredential(req.Credentials, "email", "username", "user", "user_email", "userEmail")
	if !ok {
		return nil, fmt.Errorf("email not found in credentials. Expected one of: email, username, user. Got fields: %v", getCredentialKeys(req.Credentials))
	}

	domain, ok := getCredential(req.Credentials, "domain", "site", "site_url", "siteUrl", "jira_domain", "jiraDomain", "host", "instance", "base_url", "baseUrl")
	if !ok {
		return nil, fmt.Errorf("domain not found in credentials. Got fields: %v", getCredentialKeys(req.Credentials))
	}

	// Clean up domain - remove protocol if present
	domain = strings.TrimPrefix(domain, "https://")
	domain = strings.TrimPrefix(domain, "http://")
	domain = strings.TrimSuffix(domain, "/")

	// Fetch issues from the project using the new /search/jql API (POST)
	searchURL := fmt.Sprintf("https://%s/rest/api/3/search/jql", domain)
	searchBody := map[string]interface{}{
		"jql":        fmt.Sprintf("project=%s", req.ResourceID),
		"maxResults": 50,
		"fields":     []string{"summary", "updated", "attachment"},
	}
	bodyBytes, err := json.Marshal(searchBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal search request: %w", err)
	}
	httpReq, err := http.NewRequestWithContext(ctx, "POST", searchURL, bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, err
	}
	httpReq.SetBasicAuth(email, apiToken)
	httpReq.Header.Set("Accept", "application/json")
	httpReq.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch Jira issues: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("Jira API error (%d): %s", resp.StatusCode, string(body))
	}

	var searchResult struct {
		Issues []struct {
			ID     string `json:"id"`
			Key    string `json:"key"`
			Fields struct {
				Summary string `json:"summary"`
				Updated string `json:"updated"`
			} `json:"fields"`
		} `json:"issues"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&searchResult); err != nil {
		return nil, err
	}

	files := make([]IntegrationFile, len(searchResult.Issues))
	for i, issue := range searchResult.Issues {
		files[i] = IntegrationFile{
			ID:        issue.ID,
			Name:      fmt.Sprintf("%s - %s", issue.Key, issue.Fields.Summary),
			Type:      "issue",
			URL:       fmt.Sprintf("https://%s/browse/%s", domain, issue.Key),
			UpdatedAt: issue.Fields.Updated,
			Metadata: map[string]interface{}{
				"key": issue.Key,
			},
		}
	}

	return &FetchFilesResponse{
		IntegrationName: "Jira",
		ResourceID:      req.ResourceID,
		ResourceName:    fmt.Sprintf("Project %s", req.ResourceID),
		Files:           files,
	}, nil
}

// JiraEpic represents an Epic from Jira that can be imported as a Capability
type JiraEpic struct {
	ID          string                 `json:"id"`
	Key         string                 `json:"key"`
	Summary     string                 `json:"summary"`
	Description string                 `json:"description"`
	Status      string                 `json:"status"`
	Priority    string                 `json:"priority"`
	Labels      []string               `json:"labels"`
	Created     string                 `json:"created"`
	Updated     string                 `json:"updated"`
	URL         string                 `json:"url"`
	IssueType   string                 `json:"issue_type"`
	Metadata    map[string]interface{} `json:"metadata"`
}

// FetchJiraEpicsRequest is the request for fetching Jira Epics
type FetchJiraEpicsRequest struct {
	ProjectKey  string            `json:"project_key"`
	Credentials map[string]string `json:"credentials"`
}

// FetchJiraEpicsResponse is the response containing Jira Epics
type FetchJiraEpicsResponse struct {
	ProjectKey  string      `json:"project_key"`
	ProjectName string      `json:"project_name"`
	Epics       []JiraEpic  `json:"epics"`
	Total       int         `json:"total"`
}

// FetchJiraEpics fetches all Epics (and optionally Sagas) from a Jira project
func FetchJiraEpics(ctx context.Context, req FetchJiraEpicsRequest) (*FetchJiraEpicsResponse, error) {
	// Get credentials with fallback field names
	apiToken, ok := getCredential(req.Credentials, "api_token", "access_token", "token", "api_key", "apiToken", "accessToken")
	if !ok {
		return nil, fmt.Errorf("API token not found in credentials. Expected one of: api_token, access_token, token, api_key. Got fields: %v", getCredentialKeys(req.Credentials))
	}

	email, ok := getCredential(req.Credentials, "email", "username", "user", "user_email", "userEmail")
	if !ok {
		return nil, fmt.Errorf("email not found in credentials. Expected one of: email, username, user. Got fields: %v", getCredentialKeys(req.Credentials))
	}

	domain, ok := getCredential(req.Credentials, "domain", "site", "site_url", "siteUrl", "jira_domain", "jiraDomain", "host", "instance", "base_url", "baseUrl")
	if !ok {
		return nil, fmt.Errorf("domain not found in credentials. Got fields: %v", getCredentialKeys(req.Credentials))
	}

	// Clean up domain
	domain = strings.TrimPrefix(domain, "https://")
	domain = strings.TrimPrefix(domain, "http://")
	domain = strings.TrimSuffix(domain, "/")

	// JQL to find Epics and custom issue types that might be Sagas
	// Standard Epic type is "Epic", but some orgs have custom types
	jql := fmt.Sprintf("project=%s AND (issuetype=Epic OR issuetype=Saga OR issuetype~epic) ORDER BY created DESC", req.ProjectKey)

	// Use the new /search/jql POST API
	searchURL := fmt.Sprintf("https://%s/rest/api/3/search/jql", domain)
	searchBody := map[string]interface{}{
		"jql":        jql,
		"maxResults": 100,
		"fields":     []string{"summary", "description", "status", "priority", "labels", "created", "updated", "issuetype"},
	}
	bodyBytes, err := json.Marshal(searchBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal search request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, "POST", searchURL, bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, err
	}
	httpReq.SetBasicAuth(email, apiToken)
	httpReq.Header.Set("Accept", "application/json")
	httpReq.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch Jira Epics: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("Jira API error (%d): %s", resp.StatusCode, string(body))
	}

	var searchResult struct {
		Total  int `json:"total"`
		Issues []struct {
			ID     string `json:"id"`
			Key    string `json:"key"`
			Self   string `json:"self"`
			Fields struct {
				Summary     string `json:"summary"`
				Description struct {
					Type    string `json:"type"`
					Content []struct {
						Type    string `json:"type"`
						Content []struct {
							Type string `json:"type"`
							Text string `json:"text"`
						} `json:"content"`
					} `json:"content"`
				} `json:"description"`
				Status struct {
					Name string `json:"name"`
				} `json:"status"`
				Priority struct {
					Name string `json:"name"`
				} `json:"priority"`
				Labels    []string `json:"labels"`
				Created   string   `json:"created"`
				Updated   string   `json:"updated"`
				IssueType struct {
					Name string `json:"name"`
				} `json:"issuetype"`
			} `json:"fields"`
		} `json:"issues"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&searchResult); err != nil {
		return nil, fmt.Errorf("failed to decode Jira response: %w", err)
	}

	epics := make([]JiraEpic, len(searchResult.Issues))
	for i, issue := range searchResult.Issues {
		// Extract plain text from Atlassian Document Format (ADF)
		description := extractADFText(issue.Fields.Description)

		epics[i] = JiraEpic{
			ID:          issue.ID,
			Key:         issue.Key,
			Summary:     issue.Fields.Summary,
			Description: description,
			Status:      issue.Fields.Status.Name,
			Priority:    issue.Fields.Priority.Name,
			Labels:      issue.Fields.Labels,
			Created:     issue.Fields.Created,
			Updated:     issue.Fields.Updated,
			URL:         fmt.Sprintf("https://%s/browse/%s", domain, issue.Key),
			IssueType:   issue.Fields.IssueType.Name,
			Metadata: map[string]interface{}{
				"jira_id":  issue.ID,
				"jira_key": issue.Key,
			},
		}
	}

	return &FetchJiraEpicsResponse{
		ProjectKey:  req.ProjectKey,
		ProjectName: req.ProjectKey, // Could fetch project name separately if needed
		Epics:       epics,
		Total:       searchResult.Total,
	}, nil
}

// extractADFText extracts plain text from Atlassian Document Format
func extractADFText(adf struct {
	Type    string `json:"type"`
	Content []struct {
		Type    string `json:"type"`
		Content []struct {
			Type string `json:"type"`
			Text string `json:"text"`
		} `json:"content"`
	} `json:"content"`
}) string {
	var texts []string
	for _, block := range adf.Content {
		for _, inline := range block.Content {
			if inline.Text != "" {
				texts = append(texts, inline.Text)
			}
		}
		texts = append(texts, "\n")
	}
	return strings.TrimSpace(strings.Join(texts, ""))
}
