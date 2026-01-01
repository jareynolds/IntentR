// IntentR — Copyright © 2025 James Reynolds
//
// Claude CLI Proxy Service
// This service runs on the host machine (outside Docker) and executes
// Claude CLI commands on behalf of the Docker container.

package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"time"
)

const defaultPort = "9085"

// Nginx workspace app configuration
const nginxWorkspaceAppConf = "/home/ec2-user/IntentR/nginx/conf.d/workspace-app.conf"

// Deployment configuration file path
const deploymentConfigPath = "/home/ec2-user/IntentR/config/deployment.json"

// DeploymentConfig represents the deployment configuration
type DeploymentConfig struct {
	Mode             string `json:"mode"`             // "auto", "local", or "public"
	PublicHost       string `json:"publicHost"`       // Used when mode is "public"
	WorkspaceAppPort int    `json:"workspaceAppPort"` // Port for workspace app proxy
}

// readDeploymentConfig reads the deployment configuration from file
func readDeploymentConfig() DeploymentConfig {
	config := DeploymentConfig{
		Mode:             "auto",
		PublicHost:       "",
		WorkspaceAppPort: 8080,
	}

	data, err := os.ReadFile(deploymentConfigPath)
	if err != nil {
		log.Printf("Could not read deployment config (using defaults): %v", err)
		return config
	}

	if err := json.Unmarshal(data, &config); err != nil {
		log.Printf("Could not parse deployment config (using defaults): %v", err)
		return config
	}

	return config
}

// detectCloudEnvironment tries to detect if running in a cloud environment
// Returns the public IP if detected, empty string otherwise
func detectCloudEnvironment() string {
	// Try EC2 metadata service (IMDSv1)
	client := &http.Client{Timeout: 2 * time.Second}

	// EC2 Instance Metadata Service
	resp, err := client.Get("http://169.254.169.254/latest/meta-data/public-ipv4")
	if err == nil && resp.StatusCode == 200 {
		defer resp.Body.Close()
		ip, err := io.ReadAll(resp.Body)
		if err == nil && len(ip) > 0 {
			log.Printf("Detected EC2 environment, public IP: %s", string(ip))
			return string(ip)
		}
	}

	// Try GCP metadata service
	req, _ := http.NewRequest("GET", "http://metadata.google.internal/computeMetadata/v1/instance/network-interfaces/0/access-configs/0/external-ip", nil)
	if req != nil {
		req.Header.Set("Metadata-Flavor", "Google")
		resp, err := client.Do(req)
		if err == nil && resp.StatusCode == 200 {
			defer resp.Body.Close()
			ip, err := io.ReadAll(resp.Body)
			if err == nil && len(ip) > 0 {
				log.Printf("Detected GCP environment, public IP: %s", string(ip))
				return string(ip)
			}
		}
	}

	// Try Azure metadata service
	req, _ = http.NewRequest("GET", "http://169.254.169.254/metadata/instance/network/interface/0/ipv4/ipAddress/0/publicIpAddress?api-version=2021-02-01&format=text", nil)
	if req != nil {
		req.Header.Set("Metadata", "true")
		resp, err := client.Do(req)
		if err == nil && resp.StatusCode == 200 {
			defer resp.Body.Close()
			ip, err := io.ReadAll(resp.Body)
			if err == nil && len(ip) > 0 {
				log.Printf("Detected Azure environment, public IP: %s", string(ip))
				return string(ip)
			}
		}
	}

	return ""
}

// Get public hostname/IP for workspace app URLs
// Priority: Environment variable > Config file > Auto-detect > localhost
func getPublicHost() string {
	// 1. Check for explicit PUBLIC_HOST environment variable (highest priority)
	if host := os.Getenv("PUBLIC_HOST"); host != "" {
		log.Printf("Using PUBLIC_HOST from environment: %s", host)
		return host
	}

	// 2. Read deployment config
	config := readDeploymentConfig()

	switch config.Mode {
	case "local":
		// Force localhost
		log.Printf("Deployment mode: local - using localhost")
		return "localhost"

	case "public":
		// Use configured public host
		if config.PublicHost != "" {
			log.Printf("Deployment mode: public - using configured host: %s", config.PublicHost)
			return config.PublicHost
		}
		log.Printf("Deployment mode: public but no host configured - falling back to auto-detect")
		fallthrough

	case "auto":
		fallthrough
	default:
		// Auto-detect cloud environment
		if cloudIP := detectCloudEnvironment(); cloudIP != "" {
			log.Printf("Deployment mode: auto - detected cloud IP: %s", cloudIP)
			return cloudIP
		}
		// Default to localhost for local development
		log.Printf("Deployment mode: auto - no cloud detected, using localhost")
		return "localhost"
	}
}

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
	mux.HandleFunc("/deployment-config", corsMiddleware(handleDeploymentConfig))

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
	mux.HandleFunc("OPTIONS /deployment-config", corsMiddleware(func(w http.ResponseWriter, r *http.Request) {
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

// ========== Deployment Configuration ==========

// handleDeploymentConfig handles GET and POST for deployment configuration
func handleDeploymentConfig(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	switch r.Method {
	case http.MethodGet:
		// Return current configuration
		config := readDeploymentConfig()

		// Also include the current detected/resolved host for display
		response := map[string]interface{}{
			"mode":             config.Mode,
			"publicHost":       config.PublicHost,
			"workspaceAppPort": config.WorkspaceAppPort,
			"resolvedHost":     getPublicHost(),
			"detectedCloudIP":  detectCloudEnvironment(),
		}
		json.NewEncoder(w).Encode(response)

	case http.MethodPost:
		// Save new configuration
		var config DeploymentConfig
		if err := json.NewDecoder(r.Body).Decode(&config); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request body: " + err.Error()})
			return
		}

		// Validate mode
		validModes := map[string]bool{"auto": true, "local": true, "public": true}
		if !validModes[config.Mode] {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"error": "Invalid mode. Must be 'auto', 'local', or 'public'"})
			return
		}

		// Set default port if not specified
		if config.WorkspaceAppPort == 0 {
			config.WorkspaceAppPort = 8080
		}

		// Create config directory if it doesn't exist
		configDir := filepath.Dir(deploymentConfigPath)
		if err := os.MkdirAll(configDir, 0755); err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": "Failed to create config directory: " + err.Error()})
			return
		}

		// Marshal config with indentation for readability
		data, err := json.MarshalIndent(config, "", "  ")
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": "Failed to serialize config: " + err.Error()})
			return
		}

		// Write to file
		if err := os.WriteFile(deploymentConfigPath, data, 0644); err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": "Failed to save config: " + err.Error()})
			return
		}

		log.Printf("Deployment config saved: mode=%s, publicHost=%s, port=%d", config.Mode, config.PublicHost, config.WorkspaceAppPort)

		// Return the saved config with resolved host
		response := map[string]interface{}{
			"mode":             config.Mode,
			"publicHost":       config.PublicHost,
			"workspaceAppPort": config.WorkspaceAppPort,
			"resolvedHost":     getPublicHost(),
			"saved":            true,
		}
		json.NewEncoder(w).Encode(response)

	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(map[string]string{"error": "Method not allowed"})
	}
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

	// Parse ports from start script BEFORE starting
	ports := parsePortsFromStartScript(startScript)
	var appPort int
	var cleanupLogs string
	if len(ports) > 0 {
		appPort = ports[0]
		// Kill any existing process on the port before starting
		if isPortInUse(appPort) {
			log.Printf("Port %d is in use, killing existing process...", appPort)
			killed, killLog := killProcessOnPort(appPort)
			cleanupLogs = killLog
			if killed {
				log.Printf("Successfully killed process on port %d", appPort)
				// Give the OS a moment to release the port
				time.Sleep(500 * time.Millisecond)
			}
		}
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

	// Prepend cleanup logs if any
	if cleanupLogs != "" {
		logs = cleanupLogs + "\n" + logs
	}

	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(AppStatusResponse{
			Error: fmt.Sprintf("start.sh failed: %v", err),
			Logs:  logs,
		})
		return
	}

	// Configure nginx to proxy port 8080 to the app
	if appPort > 0 {
		if err := writeNginxWorkspaceConfig(appPort); err != nil {
			logs += fmt.Sprintf("\nWarning: could not configure nginx proxy: %v", err)
		}
	}

	// Build public URL
	publicHost := getPublicHost()
	publicURL := fmt.Sprintf("http://%s:8080", publicHost)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(AppStatusResponse{
		Logs:      logs,
		IsRunning: true,
		Port:      appPort,
		URL:       publicURL,
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

	// Clear nginx workspace app config
	if err := clearNginxWorkspaceConfig(); err != nil {
		logs += fmt.Sprintf("\nWarning: could not clear nginx config: %v", err)
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

			// Return public URL via nginx proxy on port 8080
			publicHost := getPublicHost()
			response.URL = fmt.Sprintf("http://%s:8080", publicHost)

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

// killProcessOnPort kills any process using the specified port
// Returns true if a process was killed, along with a log message
func killProcessOnPort(port int) (bool, string) {
	// Get the PID(s) of processes using this port
	cmd := exec.Command("lsof", "-t", "-i", fmt.Sprintf(":%d", port))
	output, err := cmd.Output()
	if err != nil || len(output) == 0 {
		return false, ""
	}

	// Parse PIDs (may be multiple, one per line)
	pids := bytes.Split(bytes.TrimSpace(output), []byte("\n"))
	var killedPids []string

	for _, pidBytes := range pids {
		pid := string(bytes.TrimSpace(pidBytes))
		if pid == "" {
			continue
		}

		// Kill the process
		killCmd := exec.Command("kill", "-9", pid)
		if err := killCmd.Run(); err != nil {
			log.Printf("Failed to kill PID %s: %v", pid, err)
			continue
		}
		killedPids = append(killedPids, pid)
		log.Printf("Killed process PID %s on port %d", pid, port)
	}

	if len(killedPids) > 0 {
		return true, fmt.Sprintf("Killed existing process(es) on port %d (PIDs: %s)\n", port, bytes.Join(pids, []byte(", ")))
	}
	return false, ""
}

// containsPath checks if the process info contains the given path
func containsPath(processInfo, path string) bool {
	return bytes.Contains([]byte(processInfo), []byte(path))
}

// writeNginxWorkspaceConfig writes the nginx config for proxying to the workspace app
func writeNginxWorkspaceConfig(port int) error {
	config := fmt.Sprintf(`# Auto-generated workspace app proxy config
# Port: %d
location / {
    proxy_pass http://host.docker.internal:%d;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 86400;
    proxy_buffering off;
}
`, port, port)

	err := os.WriteFile(nginxWorkspaceAppConf, []byte(config), 0644)
	if err != nil {
		return fmt.Errorf("failed to write nginx config: %w", err)
	}

	log.Printf("Wrote nginx workspace app config for port %d", port)

	// Signal nginx to reload (via docker exec)
	reloadNginx()
	return nil
}

// clearNginxWorkspaceConfig clears the nginx workspace app config
func clearNginxWorkspaceConfig() error {
	config := `# Workspace app not running
# This file is updated automatically when apps start/stop
`
	err := os.WriteFile(nginxWorkspaceAppConf, []byte(config), 0644)
	if err != nil {
		return fmt.Errorf("failed to clear nginx config: %w", err)
	}

	log.Printf("Cleared nginx workspace app config")

	// Signal nginx to reload
	reloadNginx()
	return nil
}

// reloadNginx signals nginx to reload its configuration
func reloadNginx() {
	// Try docker exec first (for Docker deployments)
	cmd := exec.Command("docker", "exec", "intentr-nginx-1", "nginx", "-s", "reload")
	if err := cmd.Run(); err != nil {
		// Try alternative container name
		cmd = exec.Command("docker", "exec", "nginx", "nginx", "-s", "reload")
		if err := cmd.Run(); err != nil {
			// Try systemctl for non-Docker deployments
			cmd = exec.Command("sudo", "nginx", "-s", "reload")
			if err := cmd.Run(); err != nil {
				log.Printf("Warning: could not reload nginx: %v", err)
			}
		}
	}
	log.Printf("Signaled nginx to reload")
}
