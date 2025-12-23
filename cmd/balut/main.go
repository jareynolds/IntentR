// IntentR — Copyright © 2025 James Reynolds
//
// This file is part of IntentR.
// You may use this file under either:
//   • The AGPLv3 Open Source License, OR
//   • The IntentR Commercial License
// See the LICENSE.AGPL and LICENSE.COMMERCIAL files for details.

package main

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"syscall"

	"github.com/jareynolds/intentr/pkg/container"
)

func main() {
	// Create the main orchestrator
	orchestrator := container.NewOrchestrator()

	// TODO: Register containers here as they are implemented
	// Example:
	// orchestrator.Register(newExampleContainer())

	// Set up context with cancellation
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Set up signal handling for graceful shutdown
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)

	// Start all containers
	fmt.Println("Starting IntentR orchestrator...")
	if err := orchestrator.Start(ctx); err != nil {
		fmt.Fprintf(os.Stderr, "Failed to start orchestrator: %v\n", err)
		os.Exit(1)
	}

	fmt.Println("All containers started successfully")

	// Print status
	for _, info := range orchestrator.Status() {
		fmt.Printf("  - %s\n", info)
	}

	// Wait for shutdown signal
	fmt.Println("\nPress Ctrl+C to stop...")
	<-sigChan

	// Graceful shutdown
	fmt.Println("\nShutting down orchestrator...")
	if err := orchestrator.Stop(ctx); err != nil {
		fmt.Fprintf(os.Stderr, "Error during shutdown: %v\n", err)
		os.Exit(1)
	}

	fmt.Println("Shutdown complete")
}
