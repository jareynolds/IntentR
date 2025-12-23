// IntentR - Copyright 2025 James Reynolds
//
// Mock Adapter for UbeCLI Testing
// Provides predictable responses for testing without LLM calls

package adapters

import (
	"context"
	"sync"
)

// MockAdapter provides a test adapter
type MockAdapter struct {
	responses   []string
	callCount   int
	lastRequest *LLMRequest
	shouldError bool
	errorMsg    string
	mutex       sync.Mutex
}

// NewMockAdapter creates a new mock adapter
func NewMockAdapter() *MockAdapter {
	return &MockAdapter{
		responses: []string{"Mock response from UbeCLI"},
	}
}

// Name returns the adapter identifier
func (a *MockAdapter) Name() string {
	return "mock"
}

// Execute sends a prompt and returns a mock response
func (a *MockAdapter) Execute(ctx context.Context, req *LLMRequest) (*LLMResponse, error) {
	a.mutex.Lock()
	defer a.mutex.Unlock()

	a.lastRequest = req
	a.callCount++

	if a.shouldError {
		return nil, &AdapterError{
			Adapter: a.Name(),
			Message: a.errorMsg,
		}
	}

	idx := (a.callCount - 1) % len(a.responses)
	return &LLMResponse{
		Content:      a.responses[idx],
		FinishReason: "complete",
		AdapterName:  a.Name(),
		Model:        "mock-model",
	}, nil
}

// Validate always returns nil for mock
func (a *MockAdapter) Validate() error {
	return nil
}

// Capabilities returns mock capabilities
func (a *MockAdapter) Capabilities() AdapterCapabilities {
	return AdapterCapabilities{
		SupportsStreaming:    false,
		SupportsConversation: true,
		SupportsSystemPrompt: true,
		MaxContextLength:     100000,
		SupportedModels:      []string{"mock-model"},
	}
}

// SetResponses configures the responses to return
func (a *MockAdapter) SetResponses(responses ...string) {
	a.mutex.Lock()
	defer a.mutex.Unlock()
	a.responses = responses
}

// SetError configures the adapter to return an error
func (a *MockAdapter) SetError(shouldError bool, msg string) {
	a.mutex.Lock()
	defer a.mutex.Unlock()
	a.shouldError = shouldError
	a.errorMsg = msg
}

// GetCallCount returns the number of Execute calls
func (a *MockAdapter) GetCallCount() int {
	a.mutex.Lock()
	defer a.mutex.Unlock()
	return a.callCount
}

// GetLastRequest returns the last request received
func (a *MockAdapter) GetLastRequest() *LLMRequest {
	a.mutex.Lock()
	defer a.mutex.Unlock()
	return a.lastRequest
}

// Reset resets the mock state
func (a *MockAdapter) Reset() {
	a.mutex.Lock()
	defer a.mutex.Unlock()
	a.callCount = 0
	a.lastRequest = nil
	a.shouldError = false
	a.errorMsg = ""
}
