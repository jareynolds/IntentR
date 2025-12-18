// UbeCode — Copyright © 2025 James Reynolds
//
// This file is part of UbeCode.
// You may use this file under either:
//   • The AGPLv3 Open Source License, OR
//   • The UbeCode Commercial License
// See the LICENSE.AGPL and LICENSE.COMMERCIAL files for details.

package integration

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
)

// Track running processes
var (
	runningProcesses = make(map[string]*exec.Cmd)
	processMutex     sync.Mutex
)

// ChatRequest represents an incoming chat request
type ChatRequest struct {
	Message       string        `json:"message"`
	WorkspacePath string        `json:"workspacePath"`
	APIKey        string        `json:"apiKey,omitempty"`
	History       []ChatMessage `json:"history,omitempty"`
	AIPreset      int           `json:"aiPreset,omitempty"`
}

// ChatMessage represents a single message in the conversation
type ChatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// ChatResponse represents the response from Claude
type ChatResponse struct {
	Response string   `json:"response"`
	Files    []string `json:"files,omitempty"`
	Error    string   `json:"error,omitempty"`
}

// HandleAIChat handles AI chat requests with workspace-scoped file access
func (h *Handler) HandleAIChat(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req ChatRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Get API key - try request first, then environment
	apiKey := req.APIKey
	if apiKey == "" {
		apiKey = os.Getenv("ANTHROPIC_API_KEY")
	}
	if apiKey == "" {
		json.NewEncoder(w).Encode(ChatResponse{
			Error: "No Anthropic API key provided. Please set it in Settings or configure ANTHROPIC_API_KEY environment variable.",
		})
		return
	}

	// Validate and resolve workspace path
	workspacePath := req.WorkspacePath
	if workspacePath == "" {
		json.NewEncoder(w).Encode(ChatResponse{
			Error: "No workspace path provided. Please select a workspace with a configured project folder.",
		})
		return
	}

	// Ensure workspace path is absolute and exists
	if !filepath.IsAbs(workspacePath) {
		// Make it relative to the project root
		cwd, _ := os.Getwd()
		workspacePath = filepath.Join(cwd, workspacePath)
	}

	// Security check - ensure the path exists and is a directory
	info, err := os.Stat(workspacePath)
	if err != nil || !info.IsDir() {
		json.NewEncoder(w).Encode(ChatResponse{
			Error: fmt.Sprintf("Workspace folder not found or not accessible: %s", workspacePath),
		})
		return
	}

	// Copy AI Policy Preset file to workspace if aiPreset is set
	if req.AIPreset >= 1 && req.AIPreset <= 5 {
		if err := copyAIPolicyPreset(req.AIPreset, workspacePath); err != nil {
			// Log the error but don't fail the request
			fmt.Printf("Warning: Failed to copy AI Policy Preset: %v\n", err)
		}
	}

	// Get list of files in workspace for context
	files, err := listWorkspaceFiles(workspacePath, 3) // Max depth of 3
	if err != nil {
		files = []string{"Error reading workspace files"}
	}

	// Build system prompt with workspace context
	systemPrompt := buildSystemPrompt(workspacePath, files)

	// Build messages for Claude
	messages := make([]ClaudeMessage, 0)
	for _, msg := range req.History {
		messages = append(messages, ClaudeMessage{
			Role:    msg.Role,
			Content: msg.Content,
		})
	}
	messages = append(messages, ClaudeMessage{
		Role:    "user",
		Content: req.Message,
	})

	// Prepend system prompt to first message
	if len(messages) > 0 {
		if content, ok := messages[0].Content.(string); ok {
			messages[0].Content = systemPrompt + "\n\n" + content
		}
	} else {
		messages = append(messages, ClaudeMessage{
			Role:    "user",
			Content: systemPrompt + "\n\n" + req.Message,
		})
	}

	// Call Claude API
	claudeReq := ClaudeRequest{
		Model:     "claude-sonnet-4-20250514",
		MaxTokens: 16384, // Increased for large responses like test scenario generation
		Messages:  messages,
	}

	response, err := callClaudeAPIForChat(apiKey, claudeReq)
	if err != nil {
		json.NewEncoder(w).Encode(ChatResponse{
			Error: fmt.Sprintf("Claude API error: %v", err),
		})
		return
	}

	// Process response - handle file operations if requested
	processedResponse := processClaudeResponse(response, workspacePath)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(ChatResponse{
		Response: processedResponse,
		Files:    files,
	})
}

// buildSystemPrompt creates the system prompt with workspace context
func buildSystemPrompt(workspacePath string, files []string) string {
	fileList := strings.Join(files, "\n  - ")

	return fmt.Sprintf(`You are an AI assistant for the UbeCode design-driven development platform. You help users with their software projects.

IMPORTANT: You are STRICTLY scoped to work only within this workspace folder:
%s

Files in this workspace:
  - %s

You can:
1. Read files from this workspace by referencing their paths
2. Create new files in this workspace
3. Modify existing files in this workspace
4. Analyze code and provide suggestions
5. Generate code based on requirements

When you need to read a file, use the format: [READ_FILE: relative/path/to/file]
When you need to write a file, use the format: [WRITE_FILE: relative/path/to/file]
<<<content>>>
[END_FILE]

NEVER access files outside of: %s

Be helpful, concise, and focus on the user's specific requests related to their project.`, workspacePath, fileList, workspacePath)
}

// listWorkspaceFiles lists files in the workspace directory
func listWorkspaceFiles(root string, maxDepth int) ([]string, error) {
	var files []string

	err := filepath.Walk(root, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil // Skip files we can't access
		}

		// Skip hidden files and common ignore patterns
		name := info.Name()
		if strings.HasPrefix(name, ".") || name == "node_modules" || name == "vendor" || name == "__pycache__" {
			if info.IsDir() {
				return filepath.SkipDir
			}
			return nil
		}

		// Calculate depth
		relPath, _ := filepath.Rel(root, path)
		depth := len(strings.Split(relPath, string(os.PathSeparator)))
		if depth > maxDepth {
			if info.IsDir() {
				return filepath.SkipDir
			}
			return nil
		}

		// Add to list
		if relPath != "." {
			if info.IsDir() {
				files = append(files, relPath+"/")
			} else {
				files = append(files, relPath)
			}
		}

		return nil
	})

	return files, err
}

// callClaudeAPIForChat makes a request to the Claude API for chat
func callClaudeAPIForChat(apiKey string, req ClaudeRequest) (string, error) {
	jsonData, err := json.Marshal(req)
	if err != nil {
		return "", err
	}

	httpReq, err := http.NewRequest("POST", "https://api.anthropic.com/v1/messages", bytes.NewBuffer(jsonData))
	if err != nil {
		return "", err
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("x-api-key", apiKey)
	httpReq.Header.Set("anthropic-version", "2023-06-01")

	client := &http.Client{}
	resp, err := client.Do(httpReq)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	// Check for HTTP error status
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("API error (%d): %s", resp.StatusCode, string(body))
	}

	var claudeResp ClaudeResponse
	if err := json.Unmarshal(body, &claudeResp); err != nil {
		return "", fmt.Errorf("failed to parse response: %v", err)
	}

	if len(claudeResp.Content) > 0 {
		return claudeResp.Content[0].Text, nil
	}

	return "", fmt.Errorf("empty response from Claude")
}

// processClaudeResponse processes the response and handles file operations
func processClaudeResponse(response string, workspacePath string) string {
	// Process READ_FILE commands
	for strings.Contains(response, "[READ_FILE:") {
		start := strings.Index(response, "[READ_FILE:")
		end := strings.Index(response[start:], "]")
		if end == -1 {
			break
		}

		filePath := strings.TrimSpace(response[start+11 : start+end])
		fullPath := filepath.Join(workspacePath, filePath)

		// Security check - ensure path is within workspace
		if !strings.HasPrefix(fullPath, workspacePath) {
			response = strings.Replace(response, response[start:start+end+1], "[ERROR: Access denied - file outside workspace]", 1)
			continue
		}

		content, err := os.ReadFile(fullPath)
		if err != nil {
			response = strings.Replace(response, response[start:start+end+1], fmt.Sprintf("[ERROR: %v]", err), 1)
		} else {
			response = strings.Replace(response, response[start:start+end+1], string(content), 1)
		}
	}

	// Process WRITE_FILE commands
	for strings.Contains(response, "[WRITE_FILE:") {
		start := strings.Index(response, "[WRITE_FILE:")
		pathEnd := strings.Index(response[start:], "]")
		if pathEnd == -1 {
			break
		}

		filePath := strings.TrimSpace(response[start+12 : start+pathEnd])

		// Find content between <<< and >>> or [END_FILE]
		contentStart := strings.Index(response[start:], "<<<")
		contentEnd := strings.Index(response[start:], ">>>")
		if contentEnd == -1 {
			contentEnd = strings.Index(response[start:], "[END_FILE]")
		}

		if contentStart == -1 || contentEnd == -1 {
			break
		}

		content := response[start+contentStart+3 : start+contentEnd]
		content = strings.TrimSpace(content)

		fullPath := filepath.Join(workspacePath, filePath)

		// Security check - ensure path is within workspace
		if !strings.HasPrefix(fullPath, workspacePath) {
			endMarker := start + contentEnd + 3
			if strings.HasPrefix(response[start+contentEnd:], "[END_FILE]") {
				endMarker = start + contentEnd + 10
			}
			response = strings.Replace(response, response[start:endMarker], "[ERROR: Access denied - file outside workspace]", 1)
			continue
		}

		// Create directory if needed
		dir := filepath.Dir(fullPath)
		if err := os.MkdirAll(dir, 0755); err != nil {
			endMarker := start + contentEnd + 3
			response = strings.Replace(response, response[start:endMarker], fmt.Sprintf("[ERROR: %v]", err), 1)
			continue
		}

		// Write file
		if err := os.WriteFile(fullPath, []byte(content), 0644); err != nil {
			endMarker := start + contentEnd + 3
			response = strings.Replace(response, response[start:endMarker], fmt.Sprintf("[ERROR: %v]", err), 1)
		} else {
			endMarker := start + contentEnd + 3
			if strings.HasPrefix(response[start+contentEnd:], "[END_FILE]") {
				endMarker = start + contentEnd + 10
			}
			response = strings.Replace(response, response[start:endMarker], fmt.Sprintf("[FILE WRITTEN: %s]", filePath), 1)
		}
	}

	return response
}

// GenerateCodeRequest represents a code generation request
type GenerateCodeRequest struct {
	WorkspacePath    string `json:"workspacePath"`
	APIKey           string `json:"apiKey,omitempty"`
	AIPreset         int    `json:"aiPreset"`
	UIFramework      string `json:"uiFramework,omitempty"`
	AdditionalPrompt string `json:"additionalPrompt,omitempty"`
}

// CodeFilesRequest represents a request to list code files
type CodeFilesRequest struct {
	WorkspacePath string `json:"workspacePath"`
}

// CodeFile represents a file in the code directory
type CodeFile struct {
	Name     string `json:"name"`
	Path     string `json:"path"`
	Size     int64  `json:"size"`
	Modified string `json:"modified"`
}

// CodeFilesResponse represents the response with code files
type CodeFilesResponse struct {
	Files []CodeFile `json:"files"`
	Error string     `json:"error,omitempty"`
}

// HandleCodeFiles handles requests to list files in the ./code directory
func (h *Handler) HandleCodeFiles(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req CodeFilesRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	workspacePath := req.WorkspacePath
	if workspacePath == "" {
		json.NewEncoder(w).Encode(CodeFilesResponse{
			Error: "No workspace path provided.",
		})
		return
	}

	if !filepath.IsAbs(workspacePath) {
		cwd, _ := os.Getwd()
		workspacePath = filepath.Join(cwd, workspacePath)
	}

	codePath := filepath.Join(workspacePath, "code")

	// Check if code directory exists
	if _, err := os.Stat(codePath); os.IsNotExist(err) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(CodeFilesResponse{
			Files: []CodeFile{},
		})
		return
	}

	var files []CodeFile
	err := filepath.Walk(codePath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil
		}
		if !info.IsDir() {
			relPath, _ := filepath.Rel(codePath, path)
			files = append(files, CodeFile{
				Name:     info.Name(),
				Path:     relPath,
				Size:     info.Size(),
				Modified: info.ModTime().Format("2006-01-02 15:04:05"),
			})
		}
		return nil
	})

	if err != nil {
		json.NewEncoder(w).Encode(CodeFilesResponse{
			Error: fmt.Sprintf("Failed to read code directory: %v", err),
		})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(CodeFilesResponse{
		Files: files,
	})
}

// RunAppRequest represents a request to run the application
type RunAppRequest struct {
	WorkspacePath string `json:"workspacePath"`
}

// RunAppResponse represents the response from running an app
type RunAppResponse struct {
	URL         string `json:"url,omitempty"`
	ProjectType string `json:"projectType,omitempty"`
	Command     string `json:"command,omitempty"`
	Error       string `json:"error,omitempty"`
	Logs        string `json:"logs,omitempty"`
}

// AppStatusResponse represents the status check response
type AppStatusResponse struct {
	IsRunning       bool     `json:"isRunning"`
	Port            int      `json:"port,omitempty"`
	Ports           []int    `json:"ports,omitempty"`
	URL             string   `json:"url,omitempty"`
	IsThisWorkspace bool     `json:"isThisWorkspace"`
	OtherProcess    string   `json:"otherProcess,omitempty"`
	HasStartScript  bool     `json:"hasStartScript"`
	HasStopScript   bool     `json:"hasStopScript"`
	Error           string   `json:"error,omitempty"`
	Logs            string   `json:"logs,omitempty"`
}

// HandleCheckAppStatus checks if the workspace app is running
func (h *Handler) HandleCheckAppStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req RunAppRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	workspacePath := req.WorkspacePath
	if workspacePath == "" {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(AppStatusResponse{
			Error: "No workspace path provided.",
		})
		return
	}

	// Translate host path to container path if running in Docker
	// Handle both absolute paths (/Users/.../workspaces/X) and relative paths (workspaces/X)
	if idx := strings.Index(workspacePath, "/workspaces/"); idx != -1 {
		workspacePath = "/root" + workspacePath[idx:]
	} else if strings.HasPrefix(workspacePath, "workspaces/") {
		workspacePath = "/root/" + workspacePath
	}

	codePath := filepath.Join(workspacePath, "code")
	startScript := filepath.Join(codePath, "start.sh")
	stopScript := filepath.Join(codePath, "stop.sh")

	response := AppStatusResponse{
		HasStartScript: false,
		HasStopScript:  false,
		IsRunning:      false,
	}

	// Check if scripts exist
	if _, err := os.Stat(startScript); err == nil {
		response.HasStartScript = true
	}
	if _, err := os.Stat(stopScript); err == nil {
		response.HasStopScript = true
	}

	// Parse start.sh to find port configuration
	ports := parsePortsFromStartScript(startScript)
	response.Ports = ports

	if len(ports) > 0 {
		response.Port = ports[0]
		response.URL = fmt.Sprintf("http://localhost:%d", ports[0])
	}

	// Check if any of the ports are in use
	for _, port := range ports {
		if isPortInUse(port) {
			response.IsRunning = true

			// Check if it's this workspace's process
			pidFile := filepath.Join(codePath, ".pid")
			if pidData, err := os.ReadFile(pidFile); err == nil {
				pid := strings.TrimSpace(string(pidData))
				// Check if process with this PID is running
				checkCmd := exec.Command("ps", "-p", pid)
				if err := checkCmd.Run(); err == nil {
					response.IsThisWorkspace = true
				} else {
					response.IsThisWorkspace = false
					response.OtherProcess = getProcessOnPort(port)
				}
			} else {
				response.IsThisWorkspace = false
				response.OtherProcess = getProcessOnPort(port)
			}
			break
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// parsePortsFromStartScript extracts port numbers from a start.sh script
func parsePortsFromStartScript(scriptPath string) []int {
	var ports []int

	content, err := os.ReadFile(scriptPath)
	if err != nil {
		return ports
	}

	lines := strings.Split(string(content), "\n")
	for _, line := range lines {
		// Look for port patterns like "port 3000", "--port 3000", ":3000", "PORT=3000"
		line = strings.ToLower(line)

		// Skip comments
		if strings.HasPrefix(strings.TrimSpace(line), "#") {
			continue
		}

		// Look for various port patterns
		patterns := []string{"port ", "--port ", ":port=", "port="}
		for _, pattern := range patterns {
			if idx := strings.Index(line, pattern); idx != -1 {
				portStr := line[idx+len(pattern):]
				var port int
				if _, err := fmt.Sscanf(portStr, "%d", &port); err == nil && port > 0 && port < 65536 {
					// Avoid duplicates
					found := false
					for _, p := range ports {
						if p == port {
							found = true
							break
						}
					}
					if !found {
						ports = append(ports, port)
					}
				}
			}
		}

		// Also look for lsof -i :PORT pattern
		if idx := strings.Index(line, "lsof -i :"); idx != -1 {
			portStr := line[idx+9:]
			var port int
			if _, err := fmt.Sscanf(portStr, "%d", &port); err == nil && port > 0 && port < 65536 {
				found := false
				for _, p := range ports {
					if p == port {
						found = true
						break
					}
				}
				if !found {
					ports = append(ports, port)
				}
			}
		}
	}

	// If no ports found, try to detect from vite.config.js or package.json
	if len(ports) == 0 {
		codePath := filepath.Dir(scriptPath)
		if viteConfig, err := os.ReadFile(filepath.Join(codePath, "vite.config.js")); err == nil {
			if idx := strings.Index(string(viteConfig), "port:"); idx != -1 {
				portStr := string(viteConfig)[idx+5:]
				var port int
				if _, err := fmt.Sscanf(strings.TrimSpace(portStr), "%d", &port); err == nil && port > 0 {
					ports = append(ports, port)
				}
			}
		}
	}

	return ports
}

// isPortInUse checks if a port is currently in use
func isPortInUse(port int) bool {
	cmd := exec.Command("lsof", "-i", fmt.Sprintf(":%d", port))
	output, err := cmd.Output()
	return err == nil && len(output) > 0
}

// getProcessOnPort returns info about what process is using a port
func getProcessOnPort(port int) string {
	cmd := exec.Command("lsof", "-i", fmt.Sprintf(":%d", port), "-t")
	output, err := cmd.Output()
	if err != nil {
		return ""
	}

	pid := strings.TrimSpace(string(output))
	if pid == "" {
		return ""
	}

	// Get process name
	psCmd := exec.Command("ps", "-p", pid, "-o", "comm=")
	psOutput, err := psCmd.Output()
	if err != nil {
		return fmt.Sprintf("PID %s", pid)
	}

	return fmt.Sprintf("%s (PID %s)", strings.TrimSpace(string(psOutput)), pid)
}

// HandleRunApp handles requests to run the generated application using start.sh
func (h *Handler) HandleRunApp(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req RunAppRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	workspacePath := req.WorkspacePath
	if workspacePath == "" {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(RunAppResponse{
			Error: "No workspace path provided.",
		})
		return
	}

	if !filepath.IsAbs(workspacePath) {
		cwd, _ := os.Getwd()
		workspacePath = filepath.Join(cwd, workspacePath)
	}

	// Translate host path to container path if running in Docker
	// Handle both absolute paths (/Users/.../workspaces/X) and relative paths (workspaces/X)
	if idx := strings.Index(workspacePath, "/workspaces/"); idx != -1 {
		workspacePath = "/root" + workspacePath[idx:]
	} else if strings.HasPrefix(workspacePath, "workspaces/") {
		workspacePath = "/root/" + workspacePath
	}

	codePath := filepath.Join(workspacePath, "code")
	startScript := filepath.Join(codePath, "start.sh")

	fmt.Printf("[RunApp] Looking for start.sh in: %s\n", codePath)

	// Check if start.sh exists
	if _, err := os.Stat(startScript); err != nil {
		// Fall back to legacy behavior if no start.sh
		projectType, cmd, port := detectProjectType(codePath)
		if projectType == "" {
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(RunAppResponse{
				Error: "No start.sh script found and could not detect project type.",
			})
			return
		}

		// Legacy: run detected command
		processMutex.Lock()
		if existingCmd, exists := runningProcesses[workspacePath]; exists {
			if existingCmd.Process != nil {
				existingCmd.Process.Kill()
			}
			delete(runningProcesses, workspacePath)
		}
		processMutex.Unlock()

		cmd.Dir = codePath
		cmd.Stdout = os.Stdout
		cmd.Stderr = os.Stderr

		if err := cmd.Start(); err != nil {
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(RunAppResponse{
				Error: fmt.Sprintf("Failed to start application: %v", err),
			})
			return
		}

		processMutex.Lock()
		runningProcesses[workspacePath] = cmd
		processMutex.Unlock()

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(RunAppResponse{
			URL:         fmt.Sprintf("http://localhost:%d", port),
			ProjectType: projectType,
			Command:     strings.Join(cmd.Args, " "),
		})
		return
	}

	// Execute start.sh script
	cmd := exec.Command("sh", startScript)
	cmd.Dir = codePath

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err := cmd.Run()
	logs := stdout.String()
	if stderr.Len() > 0 {
		logs += "\n" + stderr.String()
	}

	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(RunAppResponse{
			Error: fmt.Sprintf("start.sh failed: %v", err),
			Logs:  logs,
		})
		return
	}

	// Parse ports from start.sh to get the URL
	ports := parsePortsFromStartScript(startScript)
	url := ""
	if len(ports) > 0 {
		url = fmt.Sprintf("http://localhost:%d", ports[0])
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(RunAppResponse{
		URL:         url,
		ProjectType: "Custom (start.sh)",
		Command:     "./start.sh",
		Logs:        logs,
	})
}

// HandleStopApp handles requests to stop a running application using stop.sh
func (h *Handler) HandleStopApp(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req RunAppRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	workspacePath := req.WorkspacePath
	if workspacePath == "" {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(RunAppResponse{
			Error: "No workspace path provided.",
		})
		return
	}

	// Translate host path to container path if running in Docker
	// Handle both absolute paths (/Users/.../workspaces/X) and relative paths (workspaces/X)
	if idx := strings.Index(workspacePath, "/workspaces/"); idx != -1 {
		workspacePath = "/root" + workspacePath[idx:]
	} else if strings.HasPrefix(workspacePath, "workspaces/") {
		workspacePath = "/root/" + workspacePath
	}

	codePath := filepath.Join(workspacePath, "code")
	stopScript := filepath.Join(codePath, "stop.sh")

	// Check if stop.sh exists
	if _, err := os.Stat(stopScript); err != nil {
		// Fall back to legacy behavior if no stop.sh
		processMutex.Lock()
		cmd, exists := runningProcesses[workspacePath]
		if exists && cmd.Process != nil {
			cmd.Process.Kill()
			delete(runningProcesses, workspacePath)
		}
		processMutex.Unlock()

		if !exists {
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(RunAppResponse{
				Error: "No stop.sh script found and no running process tracked.",
			})
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(RunAppResponse{
			Logs: "Application stopped (legacy mode - no stop.sh)",
		})
		return
	}

	// Execute stop.sh script
	cmd := exec.Command("sh", stopScript)
	cmd.Dir = codePath

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err := cmd.Run()
	logs := stdout.String()
	if stderr.Len() > 0 {
		logs += "\n" + stderr.String()
	}

	// Also clean up any tracked processes
	processMutex.Lock()
	if existingCmd, exists := runningProcesses[workspacePath]; exists {
		if existingCmd.Process != nil {
			existingCmd.Process.Kill()
		}
		delete(runningProcesses, workspacePath)
	}
	processMutex.Unlock()

	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(RunAppResponse{
			Error: fmt.Sprintf("stop.sh failed: %v", err),
			Logs:  logs,
		})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(RunAppResponse{
		Logs: logs,
	})
}

// detectProjectType determines the project type and returns the run command
// Uses ports 4000+ to avoid conflicts with UbeCode app (5173) and other services
func detectProjectType(codePath string) (string, *exec.Cmd, int) {
	// Check for Node.js (package.json)
	if _, err := os.Stat(filepath.Join(codePath, "package.json")); err == nil {
		// Check if it's a Vite or other modern project
		packageJSON, _ := os.ReadFile(filepath.Join(codePath, "package.json"))
		if strings.Contains(string(packageJSON), "vite") {
			// Use port 4173 to avoid conflict with UbeCode's 5173
			return "Node.js (Vite)", exec.Command("npm", "run", "dev", "--", "--port", "4173"), 4173
		}
		if strings.Contains(string(packageJSON), "next") {
			return "Node.js (Next.js)", exec.Command("npm", "run", "dev", "--", "-p", "4000"), 4000
		}
		if strings.Contains(string(packageJSON), "react-scripts") {
			// Set PORT env var for CRA
			cmd := exec.Command("npm", "start")
			cmd.Env = append(os.Environ(), "PORT=4000")
			return "Node.js (Create React App)", cmd, 4000
		}
		return "Node.js", exec.Command("npm", "start"), 4000
	}

	// Check for Go (go.mod)
	if _, err := os.Stat(filepath.Join(codePath, "go.mod")); err == nil {
		return "Go", exec.Command("go", "run", "."), 4080
	}

	// Check for Python (requirements.txt or main.py)
	if _, err := os.Stat(filepath.Join(codePath, "requirements.txt")); err == nil {
		if _, err := os.Stat(filepath.Join(codePath, "app.py")); err == nil {
			return "Python (Flask)", exec.Command("python", "app.py"), 4500
		}
		if _, err := os.Stat(filepath.Join(codePath, "main.py")); err == nil {
			return "Python", exec.Command("python", "main.py"), 4800
		}
	}

	// Check for simple HTML (index.html)
	if _, err := os.Stat(filepath.Join(codePath, "index.html")); err == nil {
		return "Static HTML", exec.Command("python", "-m", "http.server", "4080"), 4080
	}

	return "", nil, 0
}

// HandleGenerateCode handles code generation requests from specifications
func (h *Handler) HandleGenerateCode(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req GenerateCodeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Get API key
	apiKey := req.APIKey
	if apiKey == "" {
		apiKey = os.Getenv("ANTHROPIC_API_KEY")
	}
	if apiKey == "" {
		json.NewEncoder(w).Encode(ChatResponse{
			Error: "No Anthropic API key provided.",
		})
		return
	}

	// Validate workspace path
	workspacePath := req.WorkspacePath
	if workspacePath == "" {
		json.NewEncoder(w).Encode(ChatResponse{
			Error: "No workspace path provided.",
		})
		return
	}

	if !filepath.IsAbs(workspacePath) {
		cwd, _ := os.Getwd()
		workspacePath = filepath.Join(cwd, workspacePath)
	}

	info, err := os.Stat(workspacePath)
	if err != nil || !info.IsDir() {
		json.NewEncoder(w).Encode(ChatResponse{
			Error: fmt.Sprintf("Workspace folder not found: %s", workspacePath),
		})
		return
	}

	// Validate AI preset
	if req.AIPreset < 1 || req.AIPreset > 5 {
		json.NewEncoder(w).Encode(ChatResponse{
			Error: "Invalid AI preset. Must be between 1 and 5.",
		})
		return
	}

	// Read AI Principles Preset file
	aiPrinciplesPath := filepath.Join("/root/AI_Principles", fmt.Sprintf("AI_PRINCIPLES_Preset_%d.md", req.AIPreset))
	aiPrinciplesContent, err := os.ReadFile(aiPrinciplesPath)
	if err != nil {
		json.NewEncoder(w).Encode(ChatResponse{
			Error: fmt.Sprintf("Failed to read AI Principles Preset: %v", err),
		})
		return
	}

	// Read all specification files
	specsPath := filepath.Join(workspacePath, "specifications")
	var specContents []string

	err = filepath.Walk(specsPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil
		}
		if !info.IsDir() && strings.HasSuffix(info.Name(), ".md") {
			content, err := os.ReadFile(path)
			if err != nil {
				return nil
			}
			relPath, _ := filepath.Rel(specsPath, path)
			specContents = append(specContents, fmt.Sprintf("### File: %s\n\n%s", relPath, string(content)))
		}
		return nil
	})

	if err != nil || len(specContents) == 0 {
		json.NewEncoder(w).Encode(ChatResponse{
			Error: "No specification files found in ./specifications folder.",
		})
		return
	}

	// Build UI Framework section
	uiFrameworkSection := ""
	if req.UIFramework != "" {
		uiFrameworkSection = fmt.Sprintf("\n## UI FRAMEWORK\n\nApply the following UI Framework: %s\n", req.UIFramework)
	}

	// Build the prompt
	prompt := fmt.Sprintf(`You are following the AI governance principles defined below. Please strictly adhere to these principles while developing the application.

## AI PRINCIPLES PRESET %d

%s
%s
## SPECIFICATION FILES

%s

## INSTRUCTION

Claude, please follow the AI_PRINCIPLES_Preset_%d.md and develop the application from all the specification markdown files above, applying the currently active UI Framework for this workspace.

Generate the complete code for the application based on these specifications, following all the governance principles strictly.

IMPORTANT: Output each file using this EXACT format so the system can parse and save them:

[FILE: relative/path/to/filename.ext]
file content here
[/FILE]

For example:
[FILE: src/index.js]
console.log("Hello");
[/FILE]

Output all necessary files for the complete application. Each file must be wrapped in [FILE: path] and [/FILE] tags.`,
		req.AIPreset,
		string(aiPrinciplesContent),
		uiFrameworkSection,
		strings.Join(specContents, "\n\n---\n\n"),
		req.AIPreset)

	// Add additional prompt if provided
	if req.AdditionalPrompt != "" {
		prompt += "\n\n## ADDITIONAL INSTRUCTIONS\n\n" + req.AdditionalPrompt
	}

	// Call Claude API
	claudeReq := ClaudeRequest{
		Model:     "claude-sonnet-4-20250514",
		MaxTokens: 16384,
		Messages: []ClaudeMessage{
			{Role: "user", Content: prompt},
		},
	}

	response, err := callClaudeAPIForChat(apiKey, claudeReq)
	if err != nil {
		json.NewEncoder(w).Encode(ChatResponse{
			Error: fmt.Sprintf("Claude API error: %v", err),
		})
		return
	}

	// Create ./code directory
	codePath := filepath.Join(workspacePath, "code")
	if err := os.MkdirAll(codePath, 0755); err != nil {
		json.NewEncoder(w).Encode(ChatResponse{
			Error: fmt.Sprintf("Failed to create code directory: %v", err),
		})
		return
	}

	// Parse and write files from response
	filesWritten := parseAndWriteFiles(response, codePath)

	// Build summary
	var summary string
	if len(filesWritten) > 0 {
		summary = fmt.Sprintf("Successfully created %d file(s):\n", len(filesWritten))
		for _, f := range filesWritten {
			summary += fmt.Sprintf("  - %s\n", f)
		}
		summary += "\n--- Claude's Response ---\n\n" + response
	} else {
		summary = "No files were parsed from the response. Claude's response:\n\n" + response
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(ChatResponse{
		Response: summary,
	})
}

// parseAndWriteFiles extracts files from Claude's response and writes them to disk
func parseAndWriteFiles(response string, codePath string) []string {
	var filesWritten []string

	// Find all [FILE: path] ... [/FILE] blocks
	remaining := response
	for {
		// Find start tag
		startIdx := strings.Index(remaining, "[FILE:")
		if startIdx == -1 {
			break
		}

		// Find end of start tag (the ])
		tagEndIdx := strings.Index(remaining[startIdx:], "]")
		if tagEndIdx == -1 {
			break
		}
		tagEndIdx += startIdx

		// Extract file path
		filePath := strings.TrimSpace(remaining[startIdx+6 : tagEndIdx])

		// Find end tag
		endIdx := strings.Index(remaining[tagEndIdx:], "[/FILE]")
		if endIdx == -1 {
			break
		}
		endIdx += tagEndIdx

		// Extract content (skip the ] and any immediate newline)
		content := remaining[tagEndIdx+1 : endIdx]
		content = strings.TrimPrefix(content, "\n")
		content = strings.TrimSuffix(content, "\n")

		// Strip markdown code fences if present (```language ... ```)
		content = stripCodeFences(content)

		// Write file
		fullPath := filepath.Join(codePath, filePath)

		// Create parent directories
		if err := os.MkdirAll(filepath.Dir(fullPath), 0755); err != nil {
			fmt.Printf("Failed to create directory for %s: %v\n", filePath, err)
			remaining = remaining[endIdx+7:]
			continue
		}

		// Write file
		if err := os.WriteFile(fullPath, []byte(content), 0644); err != nil {
			fmt.Printf("Failed to write file %s: %v\n", filePath, err)
		} else {
			filesWritten = append(filesWritten, filePath)
			fmt.Printf("Created file: %s\n", fullPath)
		}

		// Move past this file block
		remaining = remaining[endIdx+7:]
	}

	// If no files were found with [FILE:] format, try alternative markdown format
	if len(filesWritten) == 0 {
		filesWritten = parseMarkdownCodeBlocks(response, codePath)
	}

	return filesWritten
}

// stripCodeFences removes markdown code fences from content
func stripCodeFences(content string) string {
	content = strings.TrimSpace(content)

	// Check if content starts with code fence
	if strings.HasPrefix(content, "```") {
		// Find end of first line (language identifier)
		firstNewline := strings.Index(content, "\n")
		if firstNewline != -1 {
			content = content[firstNewline+1:]
		}

		// Find and remove closing fence
		lastFence := strings.LastIndex(content, "```")
		if lastFence != -1 {
			content = content[:lastFence]
		}

		content = strings.TrimSpace(content)
	}

	return content
}

// parseMarkdownCodeBlocks tries to parse files from markdown format like:
// **File: path/to/file.js** or ### path/to/file.js
// followed by code blocks
func parseMarkdownCodeBlocks(response string, codePath string) []string {
	var filesWritten []string

	lines := strings.Split(response, "\n")
	var currentFile string
	var currentContent []string
	inCodeBlock := false

	for i, line := range lines {
		trimmed := strings.TrimSpace(line)

		// Check for file path indicators
		if strings.HasPrefix(trimmed, "**File:") && strings.HasSuffix(trimmed, "**") {
			// Save previous file if any
			if currentFile != "" && len(currentContent) > 0 {
				writeCodeFile(codePath, currentFile, strings.Join(currentContent, "\n"), &filesWritten)
			}
			// Extract new file path
			currentFile = strings.TrimSpace(trimmed[7 : len(trimmed)-2])
			currentContent = nil
			inCodeBlock = false
		} else if strings.HasPrefix(trimmed, "### ") && strings.Contains(trimmed, ".") && !strings.Contains(trimmed, " ") {
			// Looks like a file path header (### src/index.js)
			if currentFile != "" && len(currentContent) > 0 {
				writeCodeFile(codePath, currentFile, strings.Join(currentContent, "\n"), &filesWritten)
			}
			currentFile = strings.TrimPrefix(trimmed, "### ")
			currentContent = nil
			inCodeBlock = false
		} else if strings.HasPrefix(trimmed, "```") && currentFile != "" {
			if !inCodeBlock {
				// Start of code block
				inCodeBlock = true
			} else {
				// End of code block
				inCodeBlock = false
				// Check if next line starts a new file
				if i+1 < len(lines) {
					nextTrimmed := strings.TrimSpace(lines[i+1])
					if strings.HasPrefix(nextTrimmed, "**File:") ||
					   (strings.HasPrefix(nextTrimmed, "### ") && strings.Contains(nextTrimmed, ".")) {
						// Write current file
						if len(currentContent) > 0 {
							writeCodeFile(codePath, currentFile, strings.Join(currentContent, "\n"), &filesWritten)
							currentFile = ""
							currentContent = nil
						}
					}
				}
			}
		} else if inCodeBlock && currentFile != "" {
			currentContent = append(currentContent, line)
		}
	}

	// Write last file if any
	if currentFile != "" && len(currentContent) > 0 {
		writeCodeFile(codePath, currentFile, strings.Join(currentContent, "\n"), &filesWritten)
	}

	return filesWritten
}

// writeCodeFile writes a code file to disk
func writeCodeFile(codePath, filePath, content string, filesWritten *[]string) {
	fullPath := filepath.Join(codePath, filePath)

	// Create parent directories
	if err := os.MkdirAll(filepath.Dir(fullPath), 0755); err != nil {
		fmt.Printf("Failed to create directory for %s: %v\n", filePath, err)
		return
	}

	// Write file
	if err := os.WriteFile(fullPath, []byte(strings.TrimSpace(content)), 0644); err != nil {
		fmt.Printf("Failed to write file %s: %v\n", filePath, err)
	} else {
		*filesWritten = append(*filesWritten, filePath)
		fmt.Printf("Created file: %s\n", fullPath)
	}
}

// copyAIPolicyPreset copies the AI Policy Preset file to CODE_RULES/ACTIVE_AI_PRINCIPLES.md in the workspace
func copyAIPolicyPreset(presetNum int, workspacePath string) error {
	// Get current working directory
	cwd, err := os.Getwd()
	if err != nil {
		return fmt.Errorf("failed to get working directory: %v", err)
	}

	// Source file is in the AI_Principles folder
	sourceFile := filepath.Join(cwd, "AI_Principles", fmt.Sprintf("AI-Policy-Preset%d.md", presetNum))

	// Fallback to Docker mount path if local file doesn't exist
	if _, err := os.Stat(sourceFile); os.IsNotExist(err) {
		sourceFile = filepath.Join("/root/AI_Principles", fmt.Sprintf("AI-Policy-Preset%d.md", presetNum))
	}

	// Destination is CODE_RULES/ACTIVE_AI_PRINCIPLES.md in the workspace
	fullWorkspacePath := filepath.Join(cwd, workspacePath)
	codeRulesPath := filepath.Join(fullWorkspacePath, "CODE_RULES")

	// Ensure workspace CODE_RULES folder exists
	if err := os.MkdirAll(codeRulesPath, 0755); err != nil {
		return fmt.Errorf("failed to create workspace CODE_RULES folder %s: %v", codeRulesPath, err)
	}

	destFile := filepath.Join(codeRulesPath, "ACTIVE_AI_PRINCIPLES.md")

	// Read source file
	content, err := os.ReadFile(sourceFile)
	if err != nil {
		return fmt.Errorf("failed to read source file %s: %v", sourceFile, err)
	}

	// Write to destination (overwrite if exists)
	if err := os.WriteFile(destFile, content, 0644); err != nil {
		return fmt.Errorf("failed to write destination file %s: %v", destFile, err)
	}

	fmt.Printf("Copied AI Policy Preset %d to %s\n", presetNum, destFile)
	return nil
}

// CopyAIPolicyPresetPublic is the public version for use by handlers
func CopyAIPolicyPresetPublic(presetNum int, workspacePath string) error {
	return copyAIPolicyPreset(presetNum, workspacePath)
}

// GenerateCodeCLIRequest represents a code generation request using Claude CLI
type GenerateCodeCLIRequest struct {
	WorkspacePath    string `json:"workspacePath"`
	Command          string `json:"command"`
	AdditionalPrompt string `json:"additionalPrompt,omitempty"`
}

// HandleGenerateCodeCLI handles code generation requests using Claude CLI via proxy
func (h *Handler) HandleGenerateCodeCLI(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req GenerateCodeCLIRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate workspace path
	if req.WorkspacePath == "" {
		json.NewEncoder(w).Encode(ChatResponse{
			Error: "No workspace path provided.",
		})
		return
	}

	// Get proxy URL from environment or use default
	// When running in Docker, use host.docker.internal to reach the host
	proxyURL := os.Getenv("CLAUDE_PROXY_URL")
	if proxyURL == "" {
		proxyURL = "http://host.docker.internal:9085"
	}

	fmt.Printf("Forwarding request to Claude CLI Proxy at: %s\n", proxyURL)

	// Forward request to the Claude CLI proxy running on the host
	proxyReq := map[string]string{
		"workspacePath":    req.WorkspacePath,
		"command":          req.Command,
		"additionalPrompt": req.AdditionalPrompt,
	}

	proxyBody, err := json.Marshal(proxyReq)
	if err != nil {
		json.NewEncoder(w).Encode(ChatResponse{
			Error: fmt.Sprintf("Failed to marshal proxy request: %v", err),
		})
		return
	}

	resp, err := http.Post(proxyURL+"/execute", "application/json", bytes.NewBuffer(proxyBody))
	if err != nil {
		json.NewEncoder(w).Encode(ChatResponse{
			Error: fmt.Sprintf("Failed to connect to Claude CLI Proxy at %s. Make sure the proxy is running on the host. Error: %v", proxyURL, err),
		})
		return
	}
	defer resp.Body.Close()

	// Read and forward the response
	var proxyResp ChatResponse
	if err := json.NewDecoder(resp.Body).Decode(&proxyResp); err != nil {
		json.NewEncoder(w).Encode(ChatResponse{
			Error: fmt.Sprintf("Failed to decode proxy response: %v", err),
		})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(proxyResp)
}
