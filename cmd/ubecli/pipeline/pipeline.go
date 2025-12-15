// UbeCode - Copyright 2025 James Reynolds
//
// Prework Pipeline for UbeCLI
// Orchestrates prompt transformation before sending to LLM

package pipeline

import (
	"context"
	"fmt"
	"os/exec"
	"regexp"
	"strings"
	"time"

	"github.com/jareynolds/ubecode/cmd/ubecli/adapters"
	"github.com/jareynolds/ubecode/cmd/ubecli/config"
)

// PipelineContext carries data through stages
type PipelineContext struct {
	OriginalPrompt   string
	EnhancedPrompt   string
	LoadedContext    map[string]*LoadedFile
	AppliedRules     []string
	ValidationResult *ValidationResult
	TargetAdapter    string
	Metadata         map[string]interface{}
	StartTime        time.Time
	StageTimes       map[string]time.Duration
}

// ValidationResult contains validation status
type ValidationResult struct {
	Valid   bool
	Message string
	Blocked []string // List of blocked items
}

// Pipeline orchestrates stage execution
type Pipeline struct {
	config        *config.PreworkConfig
	contextLoader *ContextLoader
	debug         bool
}

// NewPipeline creates a configured pipeline
func NewPipeline(cfg *config.PreworkConfig, debug bool) *Pipeline {
	return &Pipeline{
		config:        cfg,
		contextLoader: NewContextLoader("", nil),
		debug:         debug,
	}
}

// Process runs all stages on a prompt
func (p *Pipeline) Process(ctx context.Context, prompt string, adapterName string) (*PipelineContext, error) {
	pctx := &PipelineContext{
		OriginalPrompt: prompt,
		EnhancedPrompt: prompt,
		LoadedContext:  make(map[string]*LoadedFile),
		AppliedRules:   []string{},
		TargetAdapter:  adapterName,
		Metadata:       make(map[string]interface{}),
		StartTime:      time.Now(),
		StageTimes:     make(map[string]time.Duration),
	}

	if !p.config.Enabled {
		// Pipeline disabled - pass through
		return pctx, nil
	}

	// Stage 1: Context Load
	if p.config.Stages.ContextLoad.Enabled {
		start := time.Now()
		if err := p.stageContextLoad(ctx, pctx); err != nil {
			return pctx, fmt.Errorf("context load stage: %w", err)
		}
		pctx.StageTimes["context_load"] = time.Since(start)
	}

	// Stage 2: Rule Application
	if p.config.Stages.RuleApplication.Enabled {
		start := time.Now()
		if err := p.stageRuleApplication(ctx, pctx); err != nil {
			return pctx, fmt.Errorf("rule application stage: %w", err)
		}
		pctx.StageTimes["rule_application"] = time.Since(start)
	}

	// Stage 3: Approval Validation
	if p.config.Stages.ApprovalValidation.Enabled {
		start := time.Now()
		if err := p.stageApprovalValidation(ctx, pctx); err != nil {
			return pctx, fmt.Errorf("approval validation stage: %w", err)
		}
		pctx.StageTimes["approval_validation"] = time.Since(start)
	}

	// Stage 4: Prompt Build
	if p.config.Stages.PromptBuild.Enabled {
		start := time.Now()
		if err := p.stagePromptBuild(ctx, pctx); err != nil {
			return pctx, fmt.Errorf("prompt build stage: %w", err)
		}
		pctx.StageTimes["prompt_build"] = time.Since(start)
	}

	// Stage 5: Format
	if p.config.Stages.Format.Enabled {
		start := time.Now()
		if err := p.stageFormat(ctx, pctx); err != nil {
			return pctx, fmt.Errorf("format stage: %w", err)
		}
		pctx.StageTimes["format"] = time.Since(start)
	}

	return pctx, nil
}

// stageContextLoad loads project context files
func (p *Pipeline) stageContextLoad(ctx context.Context, pctx *PipelineContext) error {
	if !p.config.InjectContext {
		return nil
	}

	// Load configured context files
	for _, path := range p.config.ContextFiles {
		file, err := p.contextLoader.LoadFile(path)
		if err != nil {
			// Continue on error - file might not exist
			if p.debug {
				fmt.Printf("[debug] Failed to load context file %s: %v\n", path, err)
			}
			continue
		}
		pctx.LoadedContext[path] = file
	}

	// Load specifications referenced in the prompt
	specs, _ := p.contextLoader.LoadReferencedSpecs(pctx.OriginalPrompt)
	for _, spec := range specs {
		pctx.LoadedContext[spec.Path] = spec
	}

	return nil
}

// stageRuleApplication applies configured rules
func (p *Pipeline) stageRuleApplication(ctx context.Context, pctx *PipelineContext) error {
	for _, rule := range p.config.CustomRules {
		if !shouldApplyRule(rule, pctx) {
			continue
		}

		pctx.AppliedRules = append(pctx.AppliedRules, rule.Name)

		// If rule has a command, execute it
		if rule.Command != "" {
			output, err := executeRuleCommand(rule.Command)
			if err == nil && output != "" {
				injectAs := rule.InjectAs
				if injectAs == "" {
					injectAs = rule.Name
				}
				pctx.Metadata[injectAs] = output
			}
		}
	}

	return nil
}

// stageApprovalValidation checks SAWai approval requirements
func (p *Pipeline) stageApprovalValidation(ctx context.Context, pctx *PipelineContext) error {
	// Check if prompt references enablers or capabilities
	pattern := regexp.MustCompile(`(CAP|ENB)-\d{6}`)
	matches := pattern.FindAllString(pctx.OriginalPrompt, -1)

	var blocked []string

	for _, match := range matches {
		// Load the specification to check approval status
		spec, err := p.contextLoader.LoadSpecification(match)
		if err != nil {
			continue // Specification not found, skip
		}

		// Check for approval status in content
		if strings.Contains(spec.Content, "Approval") {
			// Look for non-approved status
			if strings.Contains(spec.Content, `"Pending"`) ||
				strings.Contains(spec.Content, `Approval | Pending`) ||
				strings.Contains(spec.Content, `**Approval** | Pending`) {
				blocked = append(blocked, fmt.Sprintf("%s is not approved (status: Pending)", match))
			}
		}
	}

	if len(blocked) > 0 {
		pctx.ValidationResult = &ValidationResult{
			Valid:   false,
			Message: "Some referenced items are not approved",
			Blocked: blocked,
		}
	} else {
		pctx.ValidationResult = &ValidationResult{
			Valid:   true,
			Message: "All validations passed",
		}
	}

	return nil
}

// stagePromptBuild assembles the final enhanced prompt
func (p *Pipeline) stagePromptBuild(ctx context.Context, pctx *PipelineContext) error {
	var builder strings.Builder

	// Add loaded context
	if len(pctx.LoadedContext) > 0 {
		builder.WriteString("# Project Context\n\n")
		for path, file := range pctx.LoadedContext {
			builder.WriteString(fmt.Sprintf("## %s\n\n", path))
			builder.WriteString(file.Content)
			if file.Truncated {
				builder.WriteString("\n[Content truncated]")
			}
			builder.WriteString("\n\n")
		}
	}

	// Add applied rules
	if len(pctx.AppliedRules) > 0 {
		builder.WriteString("# Applied Rules\n\n")
		for _, rule := range p.config.CustomRules {
			for _, applied := range pctx.AppliedRules {
				if rule.Name == applied && rule.Template != "" {
					builder.WriteString(fmt.Sprintf("## %s\n\n", rule.Name))
					builder.WriteString(rule.Template)
					builder.WriteString("\n\n")
				}
			}
		}
	}

	// Add dynamic metadata (e.g., git status)
	if len(pctx.Metadata) > 0 {
		builder.WriteString("# Dynamic Context\n\n")
		for key, value := range pctx.Metadata {
			builder.WriteString(fmt.Sprintf("## %s\n\n```\n%v\n```\n\n", key, value))
		}
	}

	// Add validation warnings
	if pctx.ValidationResult != nil && !pctx.ValidationResult.Valid {
		builder.WriteString("# Validation Warnings\n\n")
		builder.WriteString("**Warning**: The following items are not approved:\n")
		for _, item := range pctx.ValidationResult.Blocked {
			builder.WriteString(fmt.Sprintf("- %s\n", item))
		}
		builder.WriteString("\nPlease request approval before implementation.\n\n")
	}

	// Add user prompt
	builder.WriteString("# User Request\n\n")
	builder.WriteString(pctx.OriginalPrompt)

	pctx.EnhancedPrompt = builder.String()
	return nil
}

// stageFormat formats the prompt for the target adapter
func (p *Pipeline) stageFormat(ctx context.Context, pctx *PipelineContext) error {
	// For now, just pass through. Different adapters may need different formats
	// This is where we could add adapter-specific formatting
	return nil
}

// shouldApplyRule determines if a rule should be applied
func shouldApplyRule(rule config.RuleConfig, pctx *PipelineContext) bool {
	if rule.AlwaysInject {
		return true
	}

	if rule.Condition != "" {
		// Simple condition parsing
		condition := strings.ToLower(rule.Condition)
		prompt := strings.ToLower(pctx.OriginalPrompt)

		if strings.Contains(condition, "contains") {
			// Parse: "prompt contains 'discovery'"
			parts := strings.Split(condition, "'")
			if len(parts) >= 2 {
				searchTerm := parts[1]
				return strings.Contains(prompt, searchTerm)
			}
		}
	}

	return false
}

// executeRuleCommand executes a shell command and returns output
func executeRuleCommand(command string) (string, error) {
	cmd := exec.Command("sh", "-c", command)
	output, err := cmd.Output()
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(string(output)), nil
}

// Execute runs the pipeline and then executes via adapter
func (p *Pipeline) Execute(ctx context.Context, prompt string, adapterName string) (*adapters.LLMResponse, error) {
	// Process through pipeline
	pctx, err := p.Process(ctx, prompt, adapterName)
	if err != nil {
		return nil, err
	}

	// Get adapter
	adapter, err := adapters.Get(adapterName)
	if err != nil {
		return nil, err
	}

	// Execute
	req := &adapters.LLMRequest{
		Prompt: pctx.EnhancedPrompt,
	}

	return adapter.Execute(ctx, req)
}

// GetEnhancedPrompt processes and returns just the enhanced prompt (for debugging)
func (p *Pipeline) GetEnhancedPrompt(ctx context.Context, prompt string) (string, error) {
	pctx, err := p.Process(ctx, prompt, "")
	if err != nil {
		return "", err
	}
	return pctx.EnhancedPrompt, nil
}
