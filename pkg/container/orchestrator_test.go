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
	"testing"
)

func TestNewOrchestrator(t *testing.T) {
	o := NewOrchestrator()
	if o == nil {
		t.Fatal("NewOrchestrator returned nil")
	}

	if o.containers == nil {
		t.Error("containers map not initialized")
	}

	if o.status == nil {
		t.Error("status map not initialized")
	}
}

func TestOrchestrator_Register(t *testing.T) {
	o := NewOrchestrator()
	c := NewExampleContainer("test")

	err := o.Register(c)
	if err != nil {
		t.Fatalf("Register failed: %v", err)
	}

	// Try to register the same container again
	err = o.Register(c)
	if err == nil {
		t.Error("Expected error when registering duplicate container")
	}
}

func TestOrchestrator_StartStop(t *testing.T) {
	o := NewOrchestrator()
	c1 := NewExampleContainer("container1")
	c2 := NewExampleContainer("container2")

	if err := o.Register(c1); err != nil {
		t.Fatalf("Failed to register container1: %v", err)
	}

	if err := o.Register(c2); err != nil {
		t.Fatalf("Failed to register container2: %v", err)
	}

	ctx := context.Background()

	// Start all containers
	if err := o.Start(ctx); err != nil {
		t.Fatalf("Start failed: %v", err)
	}

	// Check status
	statuses := o.Status()
	if len(statuses) != 2 {
		t.Errorf("Expected 2 containers, got %d", len(statuses))
	}

	for _, status := range statuses {
		if status.Status != StatusRunning {
			t.Errorf("Expected container %s to be running, got %s", status.Name, status.Status)
		}
	}

	// Stop all containers
	if err := o.Stop(ctx); err != nil {
		t.Fatalf("Stop failed: %v", err)
	}

	// Check status after stop
	statuses = o.Status()
	for _, status := range statuses {
		if status.Status != StatusStopped {
			t.Errorf("Expected container %s to be stopped, got %s", status.Name, status.Status)
		}
	}
}

func TestOrchestrator_Health(t *testing.T) {
	o := NewOrchestrator()
	c := NewExampleContainer("test")

	if err := o.Register(c); err != nil {
		t.Fatalf("Failed to register container: %v", err)
	}

	ctx := context.Background()

	// Health check before start should fail
	infos, err := o.Health(ctx)
	if err == nil {
		t.Error("Expected health check to fail before start")
	}
	if len(infos) != 1 {
		t.Errorf("Expected 1 container info, got %d", len(infos))
	}

	// Start container
	if err := o.Start(ctx); err != nil {
		t.Fatalf("Start failed: %v", err)
	}

	// Health check after start should succeed
	infos, err = o.Health(ctx)
	if err != nil {
		t.Errorf("Health check failed: %v", err)
	}
	if len(infos) != 1 {
		t.Errorf("Expected 1 container info, got %d", len(infos))
	}
	if infos[0].Error != nil {
		t.Errorf("Container reported unhealthy: %v", infos[0].Error)
	}
}

func TestExampleContainer(t *testing.T) {
	c := NewExampleContainer("test")

	if c.Name() != "test" {
		t.Errorf("Expected name 'test', got '%s'", c.Name())
	}

	ctx := context.Background()

	// Health check before start should fail
	if err := c.Health(ctx); err == nil {
		t.Error("Expected health check to fail before start")
	}

	// Start container
	if err := c.Start(ctx); err != nil {
		t.Fatalf("Start failed: %v", err)
	}

	// Health check after start should succeed
	if err := c.Health(ctx); err != nil {
		t.Errorf("Health check failed: %v", err)
	}

	// Starting again should fail
	if err := c.Start(ctx); err == nil {
		t.Error("Expected error when starting already started container")
	}

	// Stop container
	if err := c.Stop(ctx); err != nil {
		t.Fatalf("Stop failed: %v", err)
	}

	// Stopping again should fail
	if err := c.Stop(ctx); err == nil {
		t.Error("Expected error when stopping already stopped container")
	}
}
