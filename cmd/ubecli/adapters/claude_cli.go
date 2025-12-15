// UbeCode - Copyright 2025 James Reynolds
//
// Claude CLI Adapter for UbeCLI
// Executes prompts via the local Claude CLI installation

package adapters

import (
	"bytes"
	"context"
	"fmt"
	"os"
	"os/exec"
	"time"
)

// ClaudeCLIAdapter executes prompts via Claude CLI
type ClaudeCLIAdapter struct {
	config     *ClaudeCLIConfig
	claudePath string
}

// ClaudeCLIConfig configures the Claude CLI adapter
type ClaudeCLIConfig struct {
	WorkingDir      string
	Timeout         time.Duration
	SkipPermissions bool
	PrintMode       bool
}

// DefaultClaudeCLIConfig returns default configuration
func DefaultClaudeCLIConfig() *ClaudeCLIConfig {
	return &ClaudeCLIConfig{
		Timeout:         5 * time.Minute,
		SkipPermissions: true,
		PrintMode:       true,
	}
}

// NewClaudeCLIAdapter creates a new Claude CLI adapter
func NewClaudeCLIAdapter(cfg *ClaudeCLIConfig) (*ClaudeCLIAdapter, error) {
	if cfg == nil {
		cfg = DefaultClaudeCLIConfig()
	}

	claudePath, err := findClaudeCLI()
	if err != nil {
		return nil, err
	}

	return &ClaudeCLIAdapter{
		config:     cfg,
		claudePath: claudePath,
	}, nil
}

// Name returns the adapter identifier
func (a *ClaudeCLIAdapter) Name() string {
	return "claude-cli"
}

// Execute sends a prompt and returns the response
func (a *ClaudeCLIAdapter) Execute(ctx context.Context, req *LLMRequest) (*LLMResponse, error) {
	args := []string{}

	if a.config.PrintMode {
		args = append(args, "-p")
	}
	if a.config.SkipPermissions {
		args = append(args, "--dangerously-skip-permissions")
	}

	// Build the full prompt
	fullPrompt := req.Prompt
	if req.SystemPrompt != "" {
		fullPrompt = req.SystemPrompt + "\n\n---\n\n" + req.Prompt
	}
	args = append(args, fullPrompt)

	// Create command with context for timeout
	var cmdCtx context.Context
	var cancel context.CancelFunc
	if a.config.Timeout > 0 {
		cmdCtx, cancel = context.WithTimeout(ctx, a.config.Timeout)
		defer cancel()
	} else {
		cmdCtx = ctx
	}

	cmd := exec.CommandContext(cmdCtx, a.claudePath, args...)

	// Set working directory if specified
	if a.config.WorkingDir != "" {
		cmd.Dir = a.config.WorkingDir
	} else {
		cmd.Dir, _ = os.Getwd()
	}

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err := cmd.Run()
	if err != nil {
		// Check for context cancellation
		if ctx.Err() != nil {
			return nil, &AdapterError{
				Adapter: a.Name(),
				Message: "request cancelled or timed out",
				Cause:   ctx.Err(),
			}
		}

		errOutput := stderr.String()
		if errOutput == "" {
			errOutput = err.Error()
		}
		return nil, &AdapterError{
			Adapter: a.Name(),
			Message: fmt.Sprintf("Claude CLI error: %s", errOutput),
			Cause:   err,
		}
	}

	response := stdout.String()
	if response == "" {
		response = "Claude CLI completed but returned no output."
	}

	return &LLMResponse{
		Content:      response,
		FinishReason: "complete",
		AdapterName:  a.Name(),
		Model:        "claude-cli",
	}, nil
}

// Validate checks if the adapter is properly configured
func (a *ClaudeCLIAdapter) Validate() error {
	if a.claudePath == "" {
		return &AdapterError{
			Adapter: a.Name(),
			Message: "Claude CLI path not set",
		}
	}

	// Check if executable exists
	if _, err := os.Stat(a.claudePath); err != nil {
		return &AdapterError{
			Adapter: a.Name(),
			Message: fmt.Sprintf("Claude CLI not found at %s", a.claudePath),
			Cause:   err,
		}
	}

	return nil
}

// Capabilities returns what features this adapter supports
func (a *ClaudeCLIAdapter) Capabilities() AdapterCapabilities {
	return AdapterCapabilities{
		SupportsStreaming:    false, // CLI doesn't support streaming
		SupportsConversation: false, // Each call is independent
		SupportsSystemPrompt: true,
		MaxContextLength:     200000,
		SupportedModels:      []string{"claude-cli"},
	}
}

// SetWorkingDir updates the working directory
func (a *ClaudeCLIAdapter) SetWorkingDir(dir string) {
	a.config.WorkingDir = dir
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

	return "", &AdapterError{
		Adapter: "claude-cli",
		Message: "Claude CLI not found in PATH or common locations. Install with: npm install -g @anthropic-ai/claude-code",
	}
}

// init registers the adapter with the default registry
func init() {
	adapter, err := NewClaudeCLIAdapter(nil)
	if err == nil {
		Register(adapter)
	}
}
