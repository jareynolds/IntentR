// UbeCode — Copyright © 2025 James Reynolds
//
// Claude CLI Proxy Service
// This service runs on the host machine (outside Docker) and executes
// Claude CLI commands on behalf of the Docker container.

package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
)

const defaultPort = "9085"

// Request represents an incoming CLI execution request
type Request struct {
	WorkspacePath    string `json:"workspacePath"`
	Command          string `json:"command"`
	AdditionalPrompt string `json:"additionalPrompt,omitempty"`
}

// Response represents the CLI execution response
type Response struct {
	Response string `json:"response,omitempty"`
	Error    string `json:"error,omitempty"`
}

func main() {
	port := os.Getenv("CLAUDE_PROXY_PORT")
	if port == "" {
		port = defaultPort
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/execute", corsMiddleware(handleExecute))
	mux.HandleFunc("/health", corsMiddleware(handleHealth))
	mux.HandleFunc("/run-app", corsMiddleware(handleRunApp))
	mux.HandleFunc("/stop-app", corsMiddleware(handleStopApp))
	mux.HandleFunc("/check-app-status", corsMiddleware(handleCheckAppStatus))

	// Handle OPTIONS for CORS preflight
	mux.HandleFunc("OPTIONS /execute", corsMiddleware(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	mux.HandleFunc("OPTIONS /run-app", corsMiddleware(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	mux.HandleFunc("OPTIONS /stop-app", corsMiddleware(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	mux.HandleFunc("OPTIONS /check-app-status", corsMiddleware(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	addr := ":" + port
	log.Printf("Claude CLI Proxy starting on %s", addr)
	log.Printf("This service must run on the host machine (not in Docker)")
	log.Printf("It executes Claude CLI commands on behalf of Docker containers")

	if err := http.ListenAndServe(addr, mux); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}

func corsMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		next(w, r)
	}
}

func handleHealth(w http.ResponseWriter, r *http.Request) {
	// Check if claude CLI is available
	claudePath, err := findClaudeCLI()
	if err != nil {
		w.WriteHeader(http.StatusServiceUnavailable)
		json.NewEncoder(w).Encode(Response{Error: err.Error()})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status":     "healthy",
		"claudePath": claudePath,
	})
}

func handleExecute(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req Request
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(Response{Error: "Invalid request body: " + err.Error()})
		return
	}

	// Validate workspace path
	workspacePath := req.WorkspacePath
	if workspacePath == "" {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(Response{Error: "No workspace path provided"})
		return
	}

	// Make path absolute if needed
	if !filepath.IsAbs(workspacePath) {
		cwd, _ := os.Getwd()
		workspacePath = filepath.Join(cwd, workspacePath)
	}

	// Verify workspace exists
	info, err := os.Stat(workspacePath)
	if err != nil || !info.IsDir() {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(Response{Error: fmt.Sprintf("Workspace folder not found: %s", workspacePath)})
		return
	}

	// Build the full prompt
	fullPrompt := req.Command
	if req.AdditionalPrompt != "" {
		fullPrompt += "\n\n## ADDITIONAL INSTRUCTIONS\n\n" + req.AdditionalPrompt
	}

	// Find claude CLI
	claudePath, err := findClaudeCLI()
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(Response{Error: err.Error()})
		return
	}

	// Execute claude CLI with --dangerously-skip-permissions for automation
	// This allows Claude to write files without interactive permission prompts
	log.Printf("Executing Claude CLI in directory: %s", workspacePath)
	log.Printf("Command: %s -p --dangerously-skip-permissions <prompt of %d chars>", claudePath, len(fullPrompt))

	cmd := exec.Command(claudePath, "-p", "--dangerously-skip-permissions", fullPrompt)
	cmd.Dir = workspacePath

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err = cmd.Run()
	if err != nil {
		errOutput := stderr.String()
		if errOutput == "" {
			errOutput = err.Error()
		}
		log.Printf("Claude CLI error: %s", errOutput)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(Response{Error: fmt.Sprintf("Claude CLI error: %s", errOutput)})
		return
	}

	response := stdout.String()
	if response == "" {
		response = "Claude CLI completed but returned no output."
	}

	log.Printf("Claude CLI completed successfully, response length: %d chars", len(response))

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(Response{Response: response})
}

// findClaudeCLI locates the claude CLI executable
func findClaudeCLI() (string, error) {
	// Check common locations
	locations := []string{
		"/opt/homebrew/bin/claude",  // Apple Silicon Mac (Homebrew)
		"/usr/local/bin/claude",     // Intel Mac / Linux (Homebrew)
		"/usr/bin/claude",           // System-wide Linux
	}

	// First try PATH
	if path, err := exec.LookPath("claude"); err == nil {
		return path, nil
	}

	// Then try common locations
	for _, loc := range locations {
		if _, err := os.Stat(loc); err == nil {
			return loc, nil
		}
	}

	return "", fmt.Errorf("claude CLI not found in PATH or common locations. Please install it: npm install -g @anthropic-ai/claude-code")
}

// ========== Workspace App Management ==========

// AppRequest represents a request to manage a workspace app
type AppRequest struct {
	WorkspacePath string `json:"workspacePath"`
}

// AppStatusResponse represents the status of a workspace app
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

// handleRunApp starts the workspace application using start.sh
func handleRunApp(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req AppRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(AppStatusResponse{Error: "Invalid request body: " + err.Error()})
		return
	}

	workspacePath := resolveWorkspacePath(req.WorkspacePath)
	if workspacePath == "" {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(AppStatusResponse{Error: "No workspace path provided"})
		return
	}

	codePath := filepath.Join(workspacePath, "code")
	startScript := filepath.Join(codePath, "start.sh")

	// Check if start.sh exists
	if _, err := os.Stat(startScript); err != nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(AppStatusResponse{Error: "No start.sh script found in " + codePath})
		return
	}

	log.Printf("Running start.sh in: %s", codePath)

	// Execute start.sh
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
		json.NewEncoder(w).Encode(AppStatusResponse{
			Error: fmt.Sprintf("start.sh failed: %v", err),
			Logs:  logs,
		})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(AppStatusResponse{
		Logs: logs,
	})
}

// handleStopApp stops the workspace application using stop.sh
func handleStopApp(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req AppRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(AppStatusResponse{Error: "Invalid request body: " + err.Error()})
		return
	}

	workspacePath := resolveWorkspacePath(req.WorkspacePath)
	if workspacePath == "" {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(AppStatusResponse{Error: "No workspace path provided"})
		return
	}

	codePath := filepath.Join(workspacePath, "code")
	stopScript := filepath.Join(codePath, "stop.sh")

	// Check if stop.sh exists
	if _, err := os.Stat(stopScript); err != nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(AppStatusResponse{Error: "No stop.sh script found in " + codePath})
		return
	}

	log.Printf("Running stop.sh in: %s", codePath)

	// Execute stop.sh
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

	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(AppStatusResponse{
			Error: fmt.Sprintf("stop.sh failed: %v", err),
			Logs:  logs,
		})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(AppStatusResponse{
		Logs: logs,
	})
}

// handleCheckAppStatus checks if the workspace application is running
func handleCheckAppStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req AppRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(AppStatusResponse{Error: "Invalid request body: " + err.Error()})
		return
	}

	workspacePath := resolveWorkspacePath(req.WorkspacePath)
	if workspacePath == "" {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(AppStatusResponse{Error: "No workspace path provided"})
		return
	}

	codePath := filepath.Join(workspacePath, "code")
	startScript := filepath.Join(codePath, "start.sh")
	stopScript := filepath.Join(codePath, "stop.sh")

	response := AppStatusResponse{
		HasStartScript: fileExists(startScript),
		HasStopScript:  fileExists(stopScript),
	}

	// Parse ports from start.sh
	if response.HasStartScript {
		response.Ports = parsePortsFromStartScript(startScript)
	}

	// Check if any configured port is in use
	for _, port := range response.Ports {
		if isPortInUse(port) {
			response.IsRunning = true
			response.Port = port
			response.URL = fmt.Sprintf("http://localhost:%d", port)

			// Check if it's this workspace's process
			processInfo := getProcessOnPort(port)
			if processInfo != "" {
				// Check if process is running from this workspace
				if containsPath(processInfo, codePath) {
					response.IsThisWorkspace = true
				} else {
					response.IsThisWorkspace = false
					response.OtherProcess = processInfo
				}
			} else {
				response.IsThisWorkspace = true // Assume it's ours if we can't determine
			}
			break
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// resolveWorkspacePath converts various path formats to absolute paths
func resolveWorkspacePath(path string) string {
	if path == "" {
		return ""
	}

	// If it's already absolute, return it
	if filepath.IsAbs(path) {
		return path
	}

	// Get current working directory
	cwd, err := os.Getwd()
	if err != nil {
		return ""
	}

	return filepath.Join(cwd, path)
}

// fileExists checks if a file exists
func fileExists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}

// parsePortsFromStartScript extracts port numbers from start.sh
func parsePortsFromStartScript(scriptPath string) []int {
	content, err := os.ReadFile(scriptPath)
	if err != nil {
		return nil
	}

	var ports []int
	lines := bytes.Split(content, []byte("\n"))

	for _, line := range lines {
		lineStr := string(line)
		// Look for common port patterns
		// Pattern: --port 3000, -p 3000, PORT=3000, :3000
		for port := 1024; port <= 65535; port++ {
			portStr := fmt.Sprintf("%d", port)
			if bytes.Contains(line, []byte(":"+portStr)) ||
				bytes.Contains(line, []byte("port "+portStr)) ||
				bytes.Contains(line, []byte("PORT="+portStr)) ||
				bytes.Contains(line, []byte("-p "+portStr)) ||
				bytes.Contains(line, []byte("--port "+portStr)) ||
				bytes.Contains(line, []byte("--port="+portStr)) {
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
		_ = lineStr // unused but kept for potential future use
	}

	// Default to 3000 if no ports found
	if len(ports) == 0 {
		ports = []int{3000}
	}

	return ports
}

// isPortInUse checks if a port is currently in use
func isPortInUse(port int) bool {
	cmd := exec.Command("lsof", "-i", fmt.Sprintf(":%d", port), "-P", "-n")
	output, _ := cmd.Output()
	return len(output) > 0
}

// getProcessOnPort returns info about the process using a port
func getProcessOnPort(port int) string {
	cmd := exec.Command("lsof", "-i", fmt.Sprintf(":%d", port), "-P", "-n")
	output, err := cmd.Output()
	if err != nil {
		return ""
	}
	return string(output)
}

// containsPath checks if the process info contains the given path
func containsPath(processInfo, path string) bool {
	return bytes.Contains([]byte(processInfo), []byte(path))
}
