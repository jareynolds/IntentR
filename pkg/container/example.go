// IntentR — Copyright © 2025 James Reynolds
//
// This file is part of IntentR.
// You may use this file under either:
//   • The AGPLv3 Open Source License, OR
//   • The IntentR Commercial License
// See the LICENSE.AGPL and LICENSE.COMMERCIAL files for details.

package container

import (
	"context"
	"fmt"
)

// ExampleContainer is a simple container implementation for demonstration
type ExampleContainer struct {
	name    string
	started bool
}

// NewExampleContainer creates a new example container
func NewExampleContainer(name string) *ExampleContainer {
	return &ExampleContainer{
		name: name,
	}
}

// Name returns the container name
func (e *ExampleContainer) Name() string {
	return e.name
}

// Start initializes the container
func (e *ExampleContainer) Start(ctx context.Context) error {
	if e.started {
		return fmt.Errorf("container %s already started", e.name)
	}
	e.started = true
	return nil
}

// Stop shuts down the container
func (e *ExampleContainer) Stop(ctx context.Context) error {
	if !e.started {
		return fmt.Errorf("container %s not started", e.name)
	}
	e.started = false
	return nil
}

// Health checks if the container is healthy
func (e *ExampleContainer) Health(ctx context.Context) error {
	if !e.started {
		return fmt.Errorf("container %s is not running", e.name)
	}
	return nil
}
