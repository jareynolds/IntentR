// UbeCode - Copyright 2025 James Reynolds
//
// Configuration Management for UbeCLI
// Handles loading, parsing, and providing access to configuration

package config

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"gopkg.in/yaml.v3"
)

// Config is the root configuration structure
type Config struct {
	LLM     LLMConfig     `yaml:"llm"`
	Prework PreworkConfig `yaml:"prework"`
	Shell   ShellConfig   `yaml:"shell"`
	Logging LoggingConfig `yaml:"logging"`
	Debug   DebugConfig   `yaml:"debug"`
}

// LLMConfig configures LLM adapters
type LLMConfig struct {
	Default  string                   `yaml:"default"`
	Adapters map[string]AdapterConfig `yaml:"adapters"`
}

// AdapterConfig configures a specific LLM adapter
type AdapterConfig struct {
	APIKey    string        `yaml:"api_key"`
	Model     string        `yaml:"model"`
	MaxTokens int           `yaml:"max_tokens"`
	Timeout   time.Duration `yaml:"timeout"`
	Endpoint  string        `yaml:"endpoint"`

	// Claude CLI specific
	WorkingDir      string `yaml:"working_dir"`
	SkipPermissions bool   `yaml:"skip_permissions"`
	PrintMode       bool   `yaml:"print_mode"`

	// Ollama specific
	Host string `yaml:"host"`
}

// PreworkConfig configures the prework pipeline
type PreworkConfig struct {
	Enabled       bool          `yaml:"enabled"`
	InjectContext bool          `yaml:"inject_context"`
	ContextFiles  []string      `yaml:"context_files"`
	Stages        StagesConfig  `yaml:"stages"`
	CustomRules   []RuleConfig  `yaml:"custom_rules"`
}

// StagesConfig configures pipeline stages
type StagesConfig struct {
	ContextLoad        StageConfig `yaml:"context_load"`
	RuleApplication    StageConfig `yaml:"rule_application"`
	ApprovalValidation StageConfig `yaml:"approval_validation"`
	PromptBuild        StageConfig `yaml:"prompt_build"`
	Format             StageConfig `yaml:"format"`
}

// StageConfig configures a single stage
type StageConfig struct {
	Enabled bool `yaml:"enabled"`
}

// RuleConfig configures a custom rule
type RuleConfig struct {
	Name         string `yaml:"name"`
	AlwaysInject bool   `yaml:"always_inject"`
	Condition    string `yaml:"condition"`
	Template     string `yaml:"template"`
	Command      string `yaml:"command"`
	InjectAs     string `yaml:"inject_as"`
}

// ShellConfig configures the interactive shell
type ShellConfig struct {
	Prompt      string `yaml:"prompt"`
	HistoryFile string `yaml:"history_file"`
	MaxHistory  int    `yaml:"max_history"`
}

// LoggingConfig configures logging
type LoggingConfig struct {
	Enabled        bool   `yaml:"enabled"`
	File           string `yaml:"file"`
	Level          string `yaml:"level"`
	IncludePrompts bool   `yaml:"include_prompts"`
}

// DebugConfig configures debug options
type DebugConfig struct {
	Enabled    bool `yaml:"enabled"`
	ShowPrework bool `yaml:"show_prework"`
	DryRun     bool `yaml:"dry_run"`
}

// Manager handles configuration loading and access
type Manager struct {
	config      *Config
	configPath  string
	projectPath string
	mutex       sync.RWMutex
}

// NewManager creates a new configuration manager
func NewManager() *Manager {
	return &Manager{}
}

// Load loads configuration from all sources
func (m *Manager) Load() error {
	// 1. Start with defaults
	config := DefaultConfig()

	// 2. Load global config (~/.ubecli.yaml)
	home, err := os.UserHomeDir()
	if err == nil {
		globalPath := filepath.Join(home, ".ubecli.yaml")
		if globalConfig, err := loadYAML(globalPath); err == nil {
			config = mergeConfig(config, globalConfig)
		}
	}

	// 3. Load project config (./.ubecli.yaml)
	projectPath := ".ubecli.yaml"
	if projectConfig, err := loadYAML(projectPath); err == nil {
		config = mergeConfig(config, projectConfig)
		m.configPath = projectPath
	}

	// 4. Apply environment variable overrides
	config = applyEnvOverrides(config)

	// 5. Validate final configuration
	if err := validateConfig(config); err != nil {
		return fmt.Errorf("invalid configuration: %w", err)
	}

	m.mutex.Lock()
	m.config = config
	m.mutex.Unlock()

	return nil
}

// Get returns the current configuration (read-only copy)
func (m *Manager) Get() *Config {
	m.mutex.RLock()
	defer m.mutex.RUnlock()

	if m.config == nil {
		return DefaultConfig()
	}

	// Return a copy to prevent mutation
	configCopy := *m.config
	return &configCopy
}

// Set updates a configuration value by dot-notation key
func (m *Manager) Set(key string, value interface{}) error {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	if m.config == nil {
		m.config = DefaultConfig()
	}

	// Handle common keys
	switch key {
	case "llm.default":
		if v, ok := value.(string); ok {
			m.config.LLM.Default = v
		}
	case "debug.enabled":
		if v, ok := value.(bool); ok {
			m.config.Debug.Enabled = v
		}
	case "prework.enabled":
		if v, ok := value.(bool); ok {
			m.config.Prework.Enabled = v
		}
	case "shell.prompt":
		if v, ok := value.(string); ok {
			m.config.Shell.Prompt = v
		}
	default:
		return fmt.Errorf("unknown config key: %s", key)
	}

	return nil
}

// Save persists current config to project file
func (m *Manager) Save() error {
	m.mutex.RLock()
	defer m.mutex.RUnlock()

	if m.config == nil {
		return fmt.Errorf("no configuration loaded")
	}

	path := m.configPath
	if path == "" {
		path = ".ubecli.yaml"
	}

	data, err := yaml.Marshal(m.config)
	if err != nil {
		return fmt.Errorf("failed to marshal config: %w", err)
	}

	return os.WriteFile(path, data, 0644)
}

// GetString returns a string config value by dot-notation key
func (m *Manager) GetString(key string) string {
	m.mutex.RLock()
	defer m.mutex.RUnlock()

	if m.config == nil {
		return ""
	}

	switch key {
	case "llm.default":
		return m.config.LLM.Default
	case "shell.prompt":
		return m.config.Shell.Prompt
	default:
		return ""
	}
}

// DefaultConfig returns the default configuration
func DefaultConfig() *Config {
	return &Config{
		LLM: LLMConfig{
			Default: "claude-cli",
			Adapters: map[string]AdapterConfig{
				"claude-cli": {
					Timeout:         5 * time.Minute,
					SkipPermissions: true,
					PrintMode:       true,
				},
				"claude-api": {
					Model:     "claude-sonnet-4-20250514",
					MaxTokens: 16384,
					Endpoint:  "https://api.anthropic.com/v1/messages",
					Timeout:   2 * time.Minute,
				},
				"openai": {
					Model:     "gpt-4-turbo",
					MaxTokens: 4096,
					Endpoint:  "https://api.openai.com/v1/chat/completions",
					Timeout:   2 * time.Minute,
				},
				"ollama": {
					Host:    "http://localhost:11434",
					Model:   "llama3",
					Timeout: 5 * time.Minute,
				},
				"codex-cli": {
					Timeout:         5 * time.Minute,
					SkipPermissions: true, // Maps to --dangerously-bypass-approvals-and-sandbox
					Model:           "",   // Use codex default model
				},
			},
		},
		Prework: PreworkConfig{
			Enabled:       true,
			InjectContext: true,
			ContextFiles: []string{
				"CLAUDE.md",
				"CODE_RULES/MAIN_SWDEV_PLAN.md",
			},
			Stages: StagesConfig{
				ContextLoad:        StageConfig{Enabled: true},
				RuleApplication:    StageConfig{Enabled: true},
				ApprovalValidation: StageConfig{Enabled: true},
				PromptBuild:        StageConfig{Enabled: true},
				Format:             StageConfig{Enabled: true},
			},
			CustomRules: []RuleConfig{
				{
					Name:         "sawai-enforcement",
					AlwaysInject: true,
					Template:     "You MUST follow the MAIN_SWDEV_PLAN.md for ALL development activities.\nCheck approval status before proceeding with implementation.\nNever modify approval status yourself.",
				},
			},
		},
		Shell: ShellConfig{
			Prompt:      "ube> ",
			HistoryFile: "~/.ubecli_history",
			MaxHistory:  1000,
		},
		Logging: LoggingConfig{
			Enabled: true,
			File:    "~/.ubecli/logs/audit.log",
			Level:   "info",
		},
		Debug: DebugConfig{
			Enabled:    false,
			ShowPrework: false,
			DryRun:     false,
		},
	}
}

// loadYAML loads a YAML configuration file
func loadYAML(path string) (*Config, error) {
	// Expand ~ in path
	if strings.HasPrefix(path, "~/") {
		home, err := os.UserHomeDir()
		if err != nil {
			return nil, err
		}
		path = filepath.Join(home, path[2:])
	}

	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	var config Config
	if err := yaml.Unmarshal(data, &config); err != nil {
		return nil, fmt.Errorf("failed to parse %s: %w", path, err)
	}

	return &config, nil
}

// mergeConfig merges source config into base config
func mergeConfig(base, source *Config) *Config {
	if source == nil {
		return base
	}

	result := *base

	// Merge LLM config
	if source.LLM.Default != "" {
		result.LLM.Default = source.LLM.Default
	}
	if source.LLM.Adapters != nil {
		if result.LLM.Adapters == nil {
			result.LLM.Adapters = make(map[string]AdapterConfig)
		}
		for k, v := range source.LLM.Adapters {
			result.LLM.Adapters[k] = v
		}
	}

	// Merge Prework config
	if source.Prework.ContextFiles != nil {
		result.Prework.ContextFiles = source.Prework.ContextFiles
	}
	if source.Prework.CustomRules != nil {
		result.Prework.CustomRules = append(result.Prework.CustomRules, source.Prework.CustomRules...)
	}

	// Merge Shell config
	if source.Shell.Prompt != "" {
		result.Shell.Prompt = source.Shell.Prompt
	}
	if source.Shell.HistoryFile != "" {
		result.Shell.HistoryFile = source.Shell.HistoryFile
	}
	if source.Shell.MaxHistory > 0 {
		result.Shell.MaxHistory = source.Shell.MaxHistory
	}

	// Merge Logging config
	if source.Logging.File != "" {
		result.Logging.File = source.Logging.File
	}
	if source.Logging.Level != "" {
		result.Logging.Level = source.Logging.Level
	}

	return &result
}

// applyEnvOverrides applies environment variable overrides
func applyEnvOverrides(config *Config) *Config {
	// UBECLI_LLM_DEFAULT
	if v := os.Getenv("UBECLI_LLM_DEFAULT"); v != "" {
		config.LLM.Default = v
	}

	// ANTHROPIC_API_KEY for claude adapters
	if v := os.Getenv("ANTHROPIC_API_KEY"); v != "" {
		if adapter, ok := config.LLM.Adapters["claude-api"]; ok {
			adapter.APIKey = v
			config.LLM.Adapters["claude-api"] = adapter
		}
	}

	// OPENAI_API_KEY for openai adapter
	if v := os.Getenv("OPENAI_API_KEY"); v != "" {
		if adapter, ok := config.LLM.Adapters["openai"]; ok {
			adapter.APIKey = v
			config.LLM.Adapters["openai"] = adapter
		}
	}

	// UBECLI_DEBUG
	if v := os.Getenv("UBECLI_DEBUG"); v == "true" || v == "1" {
		config.Debug.Enabled = true
	}

	// UBECLI_PROMPT
	if v := os.Getenv("UBECLI_PROMPT"); v != "" {
		config.Shell.Prompt = v
	}

	return config
}

// validateConfig validates the configuration
func validateConfig(config *Config) error {
	var errors []string

	// Validate LLM config
	if config.LLM.Default == "" {
		errors = append(errors, "llm.default is required")
	}
	if _, ok := config.LLM.Adapters[config.LLM.Default]; !ok {
		errors = append(errors, fmt.Sprintf("default adapter '%s' not configured", config.LLM.Default))
	}

	// Validate adapter configs
	for name, adapter := range config.LLM.Adapters {
		if adapter.Timeout <= 0 {
			// Set default timeout if not specified
			adapter.Timeout = 2 * time.Minute
			config.LLM.Adapters[name] = adapter
		}
	}

	if len(errors) > 0 {
		return fmt.Errorf("configuration errors:\n  - %s", strings.Join(errors, "\n  - "))
	}
	return nil
}

// MaskSecrets returns a copy of config with secrets masked
func (m *Manager) MaskSecrets() *Config {
	m.mutex.RLock()
	defer m.mutex.RUnlock()

	if m.config == nil {
		return nil
	}

	masked := *m.config
	masked.LLM.Adapters = make(map[string]AdapterConfig)

	for name, adapter := range m.config.LLM.Adapters {
		maskedAdapter := adapter
		if adapter.APIKey != "" {
			maskedAdapter.APIKey = "***REDACTED***"
		}
		masked.LLM.Adapters[name] = maskedAdapter
	}

	return &masked
}

// InitDefaultConfig creates a default .ubecli.yaml file
func InitDefaultConfig(path string) error {
	if path == "" {
		path = ".ubecli.yaml"
	}

	// Check if file already exists
	if _, err := os.Stat(path); err == nil {
		return fmt.Errorf("config file already exists: %s", path)
	}

	config := DefaultConfig()
	data, err := yaml.Marshal(config)
	if err != nil {
		return fmt.Errorf("failed to marshal config: %w", err)
	}

	header := []byte(`# UbeCLI Configuration
# See ENB-759325 for full documentation

`)

	return os.WriteFile(path, append(header, data...), 0644)
}

// ExpandPath expands ~ in file paths
func ExpandPath(path string) string {
	if strings.HasPrefix(path, "~/") {
		home, err := os.UserHomeDir()
		if err != nil {
			return path
		}
		return filepath.Join(home, path[2:])
	}
	return path
}
