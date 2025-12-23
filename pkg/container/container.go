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

// Container represents a managed component in the application
type Container interface {
	// Name returns the unique identifier for this container
	Name() string

	// Start initializes and starts the container
	Start(ctx context.Context) error

	// Stop gracefully shuts down the container
	Stop(ctx context.Context) error

	// Health checks if the container is healthy
	Health(ctx context.Context) error
}

// Status represents the current state of a container
type Status string

const (
	StatusStopped  Status = "stopped"
	StatusStarting Status = "starting"
	StatusRunning  Status = "running"
	StatusStopping Status = "stopping"
	StatusFailed   Status = "failed"
)

// ContainerInfo holds information about a container's state
type ContainerInfo struct {
	Name   string
	Status Status
	Error  error
}

// String returns a string representation of the container info
func (ci ContainerInfo) String() string {
	if ci.Error != nil {
		return fmt.Sprintf("%s [%s]: %v", ci.Name, ci.Status, ci.Error)
	}
	return fmt.Sprintf("%s [%s]", ci.Name, ci.Status)
}
