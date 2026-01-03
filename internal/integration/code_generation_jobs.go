package integration

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"sync"
	"time"

	"github.com/google/uuid"
)

// JobStatus represents the current state of a code generation job
type JobStatus string

const (
	JobStatusPending   JobStatus = "pending"
	JobStatusRunning   JobStatus = "running"
	JobStatusCompleted JobStatus = "completed"
	JobStatusFailed    JobStatus = "failed"
	JobStatusCancelled JobStatus = "cancelled"
)

// CodeGenerationJob represents a background code generation job
type CodeGenerationJob struct {
	ID               string    `json:"id"`
	Status           JobStatus `json:"status"`
	WorkspacePath    string    `json:"workspacePath"`
	Command          string    `json:"command"`
	AdditionalPrompt string    `json:"additionalPrompt,omitempty"`
	Progress         string    `json:"progress,omitempty"`
	Output           string    `json:"output,omitempty"`
	Error            string    `json:"error,omitempty"`
	StartedAt        time.Time `json:"startedAt"`
	CompletedAt      *time.Time `json:"completedAt,omitempty"`
	Logs             []JobLogEntry `json:"logs"`
	cancelFunc       context.CancelFunc
	mu               sync.RWMutex
}

// JobLogEntry represents a log entry for a job
type JobLogEntry struct {
	Timestamp time.Time `json:"timestamp"`
	Type      string    `json:"type"` // info, error, success
	Message   string    `json:"message"`
}

// JobStore manages all code generation jobs
type JobStore struct {
	jobs map[string]*CodeGenerationJob
	mu   sync.RWMutex
}

// Global job store instance
var globalJobStore = &JobStore{
	jobs: make(map[string]*CodeGenerationJob),
}

// GetJobStore returns the global job store
func GetJobStore() *JobStore {
	return globalJobStore
}

// CreateJob creates a new job and returns it
func (s *JobStore) CreateJob(workspacePath, command, additionalPrompt string) *CodeGenerationJob {
	s.mu.Lock()
	defer s.mu.Unlock()

	job := &CodeGenerationJob{
		ID:               uuid.New().String(),
		Status:           JobStatusPending,
		WorkspacePath:    workspacePath,
		Command:          command,
		AdditionalPrompt: additionalPrompt,
		StartedAt:        time.Now(),
		Logs:             make([]JobLogEntry, 0),
	}

	s.jobs[job.ID] = job
	return job
}

// GetJob retrieves a job by ID
func (s *JobStore) GetJob(id string) *CodeGenerationJob {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.jobs[id]
}

// AddLog adds a log entry to a job
func (j *CodeGenerationJob) AddLog(logType, message string) {
	j.mu.Lock()
	defer j.mu.Unlock()
	j.Logs = append(j.Logs, JobLogEntry{
		Timestamp: time.Now(),
		Type:      logType,
		Message:   message,
	})
}

// SetStatus updates the job status
func (j *CodeGenerationJob) SetStatus(status JobStatus) {
	j.mu.Lock()
	defer j.mu.Unlock()
	j.Status = status
	if status == JobStatusCompleted || status == JobStatusFailed || status == JobStatusCancelled {
		now := time.Now()
		j.CompletedAt = &now
	}
}

// SetProgress updates the job progress
func (j *CodeGenerationJob) SetProgress(progress string) {
	j.mu.Lock()
	defer j.mu.Unlock()
	j.Progress = progress
}

// SetOutput sets the job output
func (j *CodeGenerationJob) SetOutput(output string) {
	j.mu.Lock()
	defer j.mu.Unlock()
	j.Output = output
}

// SetError sets the job error
func (j *CodeGenerationJob) SetError(err string) {
	j.mu.Lock()
	defer j.mu.Unlock()
	j.Error = err
}

// Cancel cancels the job
func (j *CodeGenerationJob) Cancel() {
	j.mu.Lock()
	defer j.mu.Unlock()
	if j.cancelFunc != nil {
		j.cancelFunc()
	}
	j.Status = JobStatusCancelled
	now := time.Now()
	j.CompletedAt = &now
}

// GetSnapshot returns a copy of the job for safe reading
func (j *CodeGenerationJob) GetSnapshot() CodeGenerationJob {
	j.mu.RLock()
	defer j.mu.RUnlock()

	snapshot := CodeGenerationJob{
		ID:               j.ID,
		Status:           j.Status,
		WorkspacePath:    j.WorkspacePath,
		Command:          j.Command,
		AdditionalPrompt: j.AdditionalPrompt,
		Progress:         j.Progress,
		Output:           j.Output,
		Error:            j.Error,
		StartedAt:        j.StartedAt,
		CompletedAt:      j.CompletedAt,
		Logs:             make([]JobLogEntry, len(j.Logs)),
	}
	copy(snapshot.Logs, j.Logs)
	return snapshot
}

// RunCodeGeneration executes the code generation in the background
func (j *CodeGenerationJob) RunCodeGeneration(ctx context.Context) {
	j.SetStatus(JobStatusRunning)
	j.AddLog("info", "Starting code generation...")

	// Get proxy URL
	proxyURL := os.Getenv("CLAUDE_PROXY_URL")
	if proxyURL == "" {
		if isRunningInDocker() {
			proxyURL = "http://host.docker.internal:9085"
		} else {
			proxyURL = "http://localhost:9085"
		}
	}

	j.AddLog("info", fmt.Sprintf("Connecting to Claude CLI Proxy at %s", proxyURL))

	// Prepare the request
	proxyReq := map[string]string{
		"workspacePath":    j.WorkspacePath,
		"command":          j.Command,
		"additionalPrompt": j.AdditionalPrompt,
	}

	proxyBody, err := json.Marshal(proxyReq)
	if err != nil {
		j.SetError(fmt.Sprintf("Failed to marshal request: %v", err))
		j.SetStatus(JobStatusFailed)
		j.AddLog("error", fmt.Sprintf("Failed to marshal request: %v", err))
		return
	}

	// Create HTTP request with context for cancellation
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, proxyURL+"/execute", bytes.NewBuffer(proxyBody))
	if err != nil {
		j.SetError(fmt.Sprintf("Failed to create request: %v", err))
		j.SetStatus(JobStatusFailed)
		j.AddLog("error", fmt.Sprintf("Failed to create request: %v", err))
		return
	}
	req.Header.Set("Content-Type", "application/json")

	j.AddLog("info", "Sending request to Claude CLI...")
	j.SetProgress("Claude CLI is processing your request...")

	// Create a client with no timeout (we manage via context)
	client := &http.Client{
		Timeout: 0, // No timeout - let context handle cancellation
	}

	resp, err := client.Do(req)
	if err != nil {
		if ctx.Err() == context.Canceled {
			j.SetError("Job was cancelled")
			j.SetStatus(JobStatusCancelled)
			j.AddLog("info", "Job was cancelled by user")
			return
		}
		j.SetError(fmt.Sprintf("Failed to connect to Claude CLI Proxy: %v", err))
		j.SetStatus(JobStatusFailed)
		j.AddLog("error", fmt.Sprintf("Failed to connect to Claude CLI Proxy: %v", err))
		return
	}
	defer resp.Body.Close()

	j.AddLog("info", "Received response from Claude CLI")

	// Read and process the response
	var proxyResp struct {
		Response string `json:"response"`
		Error    string `json:"error"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&proxyResp); err != nil {
		j.SetError(fmt.Sprintf("Failed to decode response: %v", err))
		j.SetStatus(JobStatusFailed)
		j.AddLog("error", fmt.Sprintf("Failed to decode response: %v", err))
		return
	}

	if proxyResp.Error != "" {
		j.SetError(proxyResp.Error)
		j.SetStatus(JobStatusFailed)
		j.AddLog("error", fmt.Sprintf("Claude CLI error: %s", proxyResp.Error))
		return
	}

	j.SetOutput(proxyResp.Response)
	j.SetStatus(JobStatusCompleted)
	j.AddLog("success", "Code generation completed successfully")
}

// StartCodeGenerationJobRequest is the request for starting a job
type StartCodeGenerationJobRequest struct {
	WorkspacePath    string `json:"workspacePath"`
	Command          string `json:"command"`
	AdditionalPrompt string `json:"additionalPrompt,omitempty"`
}

// StartCodeGenerationJobResponse is the response when starting a job
type StartCodeGenerationJobResponse struct {
	JobID   string `json:"jobId"`
	Message string `json:"message"`
}

// JobStatusResponse is the response for job status queries
type JobStatusResponse struct {
	ID               string        `json:"id"`
	Status           JobStatus     `json:"status"`
	Progress         string        `json:"progress,omitempty"`
	Output           string        `json:"output,omitempty"`
	Error            string        `json:"error,omitempty"`
	StartedAt        time.Time     `json:"startedAt"`
	CompletedAt      *time.Time    `json:"completedAt,omitempty"`
	ElapsedSeconds   float64       `json:"elapsedSeconds"`
	Logs             []JobLogEntry `json:"logs"`
}

// HandleStartCodeGenerationJob starts a new code generation job
func (h *Handler) HandleStartCodeGenerationJob(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req StartCodeGenerationJobRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.WorkspacePath == "" {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{
			"error": "No workspace path provided",
		})
		return
	}

	// Create the job
	store := GetJobStore()
	job := store.CreateJob(req.WorkspacePath, req.Command, req.AdditionalPrompt)

	// Create cancellation context
	ctx, cancel := context.WithCancel(context.Background())
	job.cancelFunc = cancel

	// Start the job in background
	go job.RunCodeGeneration(ctx)

	// Return immediately with job ID
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(StartCodeGenerationJobResponse{
		JobID:   job.ID,
		Message: "Code generation job started",
	})
}

// HandleGetCodeGenerationJobStatus returns the status of a job
func (h *Handler) HandleGetCodeGenerationJobStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Extract job ID from path: /generate-code-status/{jobId}
	jobID := r.URL.Path[len("/generate-code-status/"):]
	if jobID == "" {
		http.Error(w, "Job ID required", http.StatusBadRequest)
		return
	}

	store := GetJobStore()
	job := store.GetJob(jobID)
	if job == nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "Job not found",
		})
		return
	}

	snapshot := job.GetSnapshot()

	// Calculate elapsed time
	var elapsed float64
	if snapshot.CompletedAt != nil {
		elapsed = snapshot.CompletedAt.Sub(snapshot.StartedAt).Seconds()
	} else {
		elapsed = time.Since(snapshot.StartedAt).Seconds()
	}

	response := JobStatusResponse{
		ID:             snapshot.ID,
		Status:         snapshot.Status,
		Progress:       snapshot.Progress,
		Output:         snapshot.Output,
		Error:          snapshot.Error,
		StartedAt:      snapshot.StartedAt,
		CompletedAt:    snapshot.CompletedAt,
		ElapsedSeconds: elapsed,
		Logs:           snapshot.Logs,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// HandleCancelCodeGenerationJob cancels a running job
func (h *Handler) HandleCancelCodeGenerationJob(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Extract job ID from path: /generate-code-cancel/{jobId}
	jobID := r.URL.Path[len("/generate-code-cancel/"):]
	if jobID == "" {
		http.Error(w, "Job ID required", http.StatusBadRequest)
		return
	}

	store := GetJobStore()
	job := store.GetJob(jobID)
	if job == nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "Job not found",
		})
		return
	}

	job.Cancel()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": "Job cancelled",
		"jobId":   jobID,
	})
}
