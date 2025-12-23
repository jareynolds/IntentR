// IntentR - Copyright 2025 James Reynolds
//
// OpenAI Codex CLI Adapter for UbeCLI
// Executes prompts via the local Codex CLI installation (@openai/codex)

package adapters

import (
	"bytes"
	"context"
	"fmt"
	"os"
	"os/exec"
	"time"
)

// CodexCLIAdapter executes prompts via OpenAI Codex CLI
type CodexCLIAdapter struct {
	config    *CodexCLIConfig
	codexPath string
}

// CodexCLIConfig configures the Codex CLI adapter
type CodexCLIConfig struct {
	WorkingDir    string
	Timeout       time.Duration
	SkipApprovals bool   // --dangerously-bypass-approvals-and-sandbox
	Model         string // -m flag (e.g., "o3", "gpt-4")
	SandboxMode   string // -s flag (read-only, workspace-write, danger-full-access)
}

// DefaultCodexCLIConfig returns default configuration
func DefaultCodexCLIConfig() *CodexCLIConfig {
	return &CodexCLIConfig{
		Timeout:       5 * time.Minute,
		SkipApprovals: true,
		Model:         "", // Use codex default
		SandboxMode:   "", // Use codex default
	}
}

// NewCodexCLIAdapter creates a new Codex CLI adapter
func NewCodexCLIAdapter(cfg *CodexCLIConfig) (*CodexCLIAdapter, error) {
	if cfg == nil {
		cfg = DefaultCodexCLIConfig()
	}

	codexPath, err := findCodexCLI()
	if err != nil {
		return nil, err
	}

	return &CodexCLIAdapter{
		config:    cfg,
		codexPath: codexPath,
	}, nil
}

// Name returns the adapter identifier
func (a *CodexCLIAdapter) Name() string {
	return "codex-cli"
}

// Execute sends a prompt and returns the response
func (a *CodexCLIAdapter) Execute(ctx context.Context, req *LLMRequest) (*LLMResponse, error) {
	// Build arguments for codex exec
	args := []string{"exec"}

	// Add working directory if specified
	if a.config.WorkingDir != "" {
		args = append(args, "-C", a.config.WorkingDir)
	} else {
		// Use current working directory
		if cwd, err := os.Getwd(); err == nil {
			args = append(args, "-C", cwd)
		}
	}

	// Add model if specified
	if a.config.Model != "" {
		args = append(args, "-m", a.config.Model)
	}

	// Add sandbox mode if specified
	if a.config.SandboxMode != "" {
		args = append(args, "-s", a.config.SandboxMode)
	}

	// Add skip approvals flag if enabled
	if a.config.SkipApprovals {
		args = append(args, "--dangerously-bypass-approvals-and-sandbox")
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

	cmd := exec.CommandContext(cmdCtx, a.codexPath, args...)

	// Set working directory for the process
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
			Message: fmt.Sprintf("Codex CLI error: %s", errOutput),
			Cause:   err,
		}
	}

	response := stdout.String()
	if response == "" {
		response = "Codex CLI completed but returned no output."
	}

	return &LLMResponse{
		Content:      response,
		FinishReason: "complete",
		AdapterName:  a.Name(),
		Model:        a.getModelName(),
	}, nil
}

// getModelName returns the model name for responses
func (a *CodexCLIAdapter) getModelName() string {
	if a.config.Model != "" {
		return a.config.Model
	}
	return "codex-cli"
}

// Validate checks if the adapter is properly configured
func (a *CodexCLIAdapter) Validate() error {
	if a.codexPath == "" {
		return &AdapterError{
			Adapter: a.Name(),
			Message: "Codex CLI path not set",
		}
	}

	// Check if executable exists
	if _, err := os.Stat(a.codexPath); err != nil {
		return &AdapterError{
			Adapter: a.Name(),
			Message: fmt.Sprintf("Codex CLI not found at %s", a.codexPath),
			Cause:   err,
		}
	}

	return nil
}

// Capabilities returns what features this adapter supports
func (a *CodexCLIAdapter) Capabilities() AdapterCapabilities {
	return AdapterCapabilities{
		SupportsStreaming:    false, // CLI exec mode doesn't support streaming
		SupportsConversation: false, // Each call is independent
		SupportsSystemPrompt: true,
		MaxContextLength:     128000, // OpenAI models typically support 128k
		SupportedModels:      []string{"o3", "o4-mini", "gpt-4", "gpt-4-turbo", "codex-cli"},
	}
}

// SetWorkingDir updates the working directory
func (a *CodexCLIAdapter) SetWorkingDir(dir string) {
	a.config.WorkingDir = dir
}

// SetModel updates the model
func (a *CodexCLIAdapter) SetModel(model string) {
	a.config.Model = model
}

// findCodexCLI locates the codex CLI executable
func findCodexCLI() (string, error) {
	// Check common locations for npm global packages
	locations := []string{
		"/usr/local/bin/codex",
		"/usr/bin/codex",
	}

	// Add nvm locations (common on macOS/Linux)
	if home, err := os.UserHomeDir(); err == nil {
		// Common nvm paths
		nvmLocations := []string{
			home + "/.nvm/versions/node/v20.19.5/bin/codex",
			home + "/.nvm/versions/node/v22.12.0/bin/codex",
			home + "/.nvm/versions/node/v21.0.0/bin/codex",
			home + "/.nvm/versions/node/v18.20.5/bin/codex",
		}
		locations = append(locations, nvmLocations...)

		// Also check npm global bin
		locations = append(locations, home+"/.npm-global/bin/codex")
	}

	// First try PATH
	if path, err := exec.LookPath("codex"); err == nil {
		return path, nil
	}

	// Then try common locations
	for _, loc := range locations {
		if _, err := os.Stat(loc); err == nil {
			return loc, nil
		}
	}

	return "", &AdapterError{
		Adapter: "codex-cli",
		Message: "Codex CLI not found in PATH or common locations. Install with: npm install -g @openai/codex",
	}
}

// init registers the adapter with the default registry
func init() {
	adapter, err := NewCodexCLIAdapter(nil)
	if err == nil {
		Register(adapter)
	}
	// If codex is not found, silently skip registration
}
