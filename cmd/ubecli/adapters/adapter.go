// IntentR - Copyright 2025 James Reynolds
//
// LLM Adapter Interface for UbeCLI
// Provides a pluggable interface for different LLM backends

package adapters

import (
	"context"
	"fmt"
	"sync"
)

// LLMAdapter is the interface all adapters must implement
type LLMAdapter interface {
	// Name returns the adapter identifier
	Name() string

	// Execute sends a prompt and returns the response
	Execute(ctx context.Context, req *LLMRequest) (*LLMResponse, error)

	// Validate checks if the adapter is properly configured
	Validate() error

	// Capabilities returns what features this adapter supports
	Capabilities() AdapterCapabilities
}

// LLMRequest represents a prompt request
type LLMRequest struct {
	Prompt         string
	SystemPrompt   string
	ConversationID string
	Messages       []Message
	MaxTokens      int
	Temperature    float64
	StopSequences  []string
	Metadata       map[string]interface{}
}

// LLMResponse represents a response from the LLM
type LLMResponse struct {
	Content      string
	FinishReason string // "complete", "max_tokens", "stop_sequence"
	TokensUsed   TokenUsage
	Model        string
	AdapterName  string
	Metadata     map[string]interface{}
}

// TokenUsage tracks token consumption
type TokenUsage struct {
	PromptTokens     int
	CompletionTokens int
	TotalTokens      int
}

// Message represents a conversation message
type Message struct {
	Role    string // "user", "assistant", "system"
	Content string
}

// AdapterCapabilities describes adapter features
type AdapterCapabilities struct {
	SupportsStreaming    bool
	SupportsConversation bool
	SupportsSystemPrompt bool
	MaxContextLength     int
	SupportedModels      []string
}

// AdapterError represents an adapter-specific error
type AdapterError struct {
	Adapter string
	Message string
	Cause   error
}

func (e *AdapterError) Error() string {
	if e.Cause != nil {
		return fmt.Sprintf("[%s] %s: %v", e.Adapter, e.Message, e.Cause)
	}
	return fmt.Sprintf("[%s] %s", e.Adapter, e.Message)
}

func (e *AdapterError) Unwrap() error {
	return e.Cause
}

// Registry manages available adapters
type Registry struct {
	adapters map[string]LLMAdapter
	default_ string
	mutex    sync.RWMutex
}

// Global registry instance
var DefaultRegistry = &Registry{
	adapters: make(map[string]LLMAdapter),
}

// Register adds an adapter to the registry
func (r *Registry) Register(adapter LLMAdapter) {
	r.mutex.Lock()
	defer r.mutex.Unlock()
	r.adapters[adapter.Name()] = adapter
}

// Get retrieves an adapter by name
func (r *Registry) Get(name string) (LLMAdapter, error) {
	r.mutex.RLock()
	defer r.mutex.RUnlock()

	adapter, ok := r.adapters[name]
	if !ok {
		available := r.ListAdapters()
		return nil, &AdapterError{
			Adapter: name,
			Message: fmt.Sprintf("adapter not found. Available: %v", available),
		}
	}
	return adapter, nil
}

// GetDefault returns the default adapter
func (r *Registry) GetDefault() (LLMAdapter, error) {
	if r.default_ == "" {
		return nil, &AdapterError{
			Adapter: "registry",
			Message: "no default adapter configured",
		}
	}
	return r.Get(r.default_)
}

// SetDefault sets the default adapter
func (r *Registry) SetDefault(name string) error {
	r.mutex.Lock()
	defer r.mutex.Unlock()

	if _, ok := r.adapters[name]; !ok {
		return &AdapterError{
			Adapter: name,
			Message: "cannot set as default: adapter not registered",
		}
	}
	r.default_ = name
	return nil
}

// ListAdapters returns all registered adapter names
func (r *Registry) ListAdapters() []string {
	r.mutex.RLock()
	defer r.mutex.RUnlock()

	names := make([]string, 0, len(r.adapters))
	for name := range r.adapters {
		names = append(names, name)
	}
	return names
}

// HasAdapter checks if an adapter is registered
func (r *Registry) HasAdapter(name string) bool {
	r.mutex.RLock()
	defer r.mutex.RUnlock()
	_, ok := r.adapters[name]
	return ok
}

// Register is a convenience function to register with the default registry
func Register(adapter LLMAdapter) {
	DefaultRegistry.Register(adapter)
}

// Get is a convenience function to get from the default registry
func Get(name string) (LLMAdapter, error) {
	return DefaultRegistry.Get(name)
}

// SetDefault is a convenience function for the default registry
func SetDefault(name string) error {
	return DefaultRegistry.SetDefault(name)
}

// ListAdapters is a convenience function for the default registry
func ListAdapters() []string {
	return DefaultRegistry.ListAdapters()
}
