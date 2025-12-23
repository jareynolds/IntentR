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
	"sync"
)

// Orchestrator manages the lifecycle of multiple containers
type Orchestrator struct {
	containers map[string]Container
	status     map[string]Status
	mu         sync.RWMutex
}

// NewOrchestrator creates a new container orchestrator
func NewOrchestrator() *Orchestrator {
	return &Orchestrator{
		containers: make(map[string]Container),
		status:     make(map[string]Status),
	}
}

// Register adds a container to the orchestrator
func (o *Orchestrator) Register(container Container) error {
	o.mu.Lock()
	defer o.mu.Unlock()

	name := container.Name()
	if _, exists := o.containers[name]; exists {
		return fmt.Errorf("container %s already registered", name)
	}

	o.containers[name] = container
	o.status[name] = StatusStopped
	return nil
}

// Start starts all registered containers in order
func (o *Orchestrator) Start(ctx context.Context) error {
	o.mu.Lock()
	defer o.mu.Unlock()

	for name, container := range o.containers {
		o.status[name] = StatusStarting
		if err := container.Start(ctx); err != nil {
			o.status[name] = StatusFailed
			return fmt.Errorf("failed to start container %s: %w", name, err)
		}
		o.status[name] = StatusRunning
	}

	return nil
}

// Stop stops all registered containers in reverse order
func (o *Orchestrator) Stop(ctx context.Context) error {
	o.mu.Lock()
	defer o.mu.Unlock()

	// Get container names in reverse order
	names := make([]string, 0, len(o.containers))
	for name := range o.containers {
		names = append(names, name)
	}

	// Stop in reverse order
	var lastErr error
	for i := len(names) - 1; i >= 0; i-- {
		name := names[i]
		container := o.containers[name]

		o.status[name] = StatusStopping
		if err := container.Stop(ctx); err != nil {
			o.status[name] = StatusFailed
			lastErr = fmt.Errorf("failed to stop container %s: %w", name, err)
		} else {
			o.status[name] = StatusStopped
		}
	}

	return lastErr
}

// Health checks the health of all containers
func (o *Orchestrator) Health(ctx context.Context) ([]ContainerInfo, error) {
	o.mu.RLock()
	defer o.mu.RUnlock()

	infos := make([]ContainerInfo, 0, len(o.containers))
	var hasError bool

	for name, container := range o.containers {
		info := ContainerInfo{
			Name:   name,
			Status: o.status[name],
		}

		if err := container.Health(ctx); err != nil {
			info.Error = err
			hasError = true
		}

		infos = append(infos, info)
	}

	if hasError {
		return infos, fmt.Errorf("one or more containers are unhealthy")
	}

	return infos, nil
}

// Status returns the current status of all containers
func (o *Orchestrator) Status() []ContainerInfo {
	o.mu.RLock()
	defer o.mu.RUnlock()

	infos := make([]ContainerInfo, 0, len(o.containers))
	for name := range o.containers {
		infos = append(infos, ContainerInfo{
			Name:   name,
			Status: o.status[name],
		})
	}

	return infos
}
