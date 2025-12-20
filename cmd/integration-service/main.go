// UbeCode — Copyright © 2025 James Reynolds
//
// This file is part of UbeCode.
// You may use this file under either:
//   • The AGPLv3 Open Source License, OR
//   • The UbeCode Commercial License
// See the LICENSE.AGPL and LICENSE.COMMERCIAL files for details.

package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/jareynolds/ubecode/internal/integration"
)

func main() {
	// Get configuration from environment
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	figmaToken := os.Getenv("FIGMA_TOKEN")
	if figmaToken == "" {
		log.Println("Warning: FIGMA_TOKEN not set. Figma API calls will fail.")
	}

	// Initialize service and handler
	service := integration.NewService(figmaToken)
	handler := integration.NewHandler(service)

	// CORS middleware
	corsMiddleware := func(next http.HandlerFunc) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Access-Control-Allow-Origin", "*")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

			if r.Method == "OPTIONS" {
				w.WriteHeader(http.StatusOK)
				return
			}

			next(w, r)
		}
	}

	// Setup routes
	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", corsMiddleware(handler.HandleHealth))
	mux.HandleFunc("OPTIONS /health", corsMiddleware(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) }))
	mux.HandleFunc("GET /figma/files/{fileKey}", corsMiddleware(handler.HandleGetFile))
	mux.HandleFunc("OPTIONS /figma/files/{fileKey}", corsMiddleware(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) }))
	mux.HandleFunc("GET /figma/files/{fileKey}/comments", corsMiddleware(handler.HandleGetComments))
	mux.HandleFunc("OPTIONS /figma/files/{fileKey}/comments", corsMiddleware(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) }))
	mux.HandleFunc("POST /analyze-integration", corsMiddleware(handler.HandleAnalyzeIntegration))
	mux.HandleFunc("OPTIONS /analyze-integration", corsMiddleware(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) }))
	mux.HandleFunc("POST /fetch-resources", corsMiddleware(handler.HandleFetchResources))
	mux.HandleFunc("OPTIONS /fetch-resources", corsMiddleware(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) }))
	mux.HandleFunc("POST /suggest-resources", corsMiddleware(handler.HandleSuggestResources))
	mux.HandleFunc("OPTIONS /suggest-resources", corsMiddleware(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) }))
	mux.HandleFunc("POST /fetch-files", corsMiddleware(handler.HandleFetchFiles))
	mux.HandleFunc("OPTIONS /fetch-files", corsMiddleware(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) }))
	mux.HandleFunc("POST /fetch-file-meta", corsMiddleware(handler.HandleFetchFileMeta))
	mux.HandleFunc("OPTIONS /fetch-file-meta", corsMiddleware(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) }))
	mux.HandleFunc("GET /specifications/list", corsMiddleware(handler.HandleListSpecifications))
	mux.HandleFunc("OPTIONS /specifications/list", corsMiddleware(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) }))
	mux.HandleFunc("POST /specifications/analyze", corsMiddleware(handler.HandleAnalyzeSpecifications))
	mux.HandleFunc("OPTIONS /specifications/analyze", corsMiddleware(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) }))
	mux.HandleFunc("POST /specifications/generate-diagram", corsMiddleware(handler.HandleGenerateDiagram))
	mux.HandleFunc("OPTIONS /specifications/generate-diagram", corsMiddleware(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) }))
	mux.HandleFunc("POST /analyze-application", corsMiddleware(handler.HandleAnalyzeApplication))
	mux.HandleFunc("OPTIONS /analyze-application", corsMiddleware(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) }))
	mux.HandleFunc("POST /export-ideation", corsMiddleware(handler.HandleExportIdeation))
	mux.HandleFunc("OPTIONS /export-ideation", corsMiddleware(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) }))
	mux.HandleFunc("GET /folders/list", corsMiddleware(handler.HandleListFolders))
	mux.HandleFunc("OPTIONS /folders/list", corsMiddleware(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) }))
	mux.HandleFunc("POST /folders/create", corsMiddleware(handler.HandleCreateFolder))
	mux.HandleFunc("OPTIONS /folders/create", corsMiddleware(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) }))
	mux.HandleFunc("POST /folders/ensure-workspace-structure", corsMiddleware(handler.HandleEnsureWorkspaceStructure))
	mux.HandleFunc("OPTIONS /folders/ensure-workspace-structure", corsMiddleware(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) }))
	mux.HandleFunc("POST /folders/move-to-deleted", corsMiddleware(handler.HandleMoveToDeleted))
	mux.HandleFunc("OPTIONS /folders/move-to-deleted", corsMiddleware(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) }))
	mux.HandleFunc("POST /workspace/init-files", corsMiddleware(handler.HandleInitWorkspaceFiles))
	mux.HandleFunc("OPTIONS /workspace/init-files", corsMiddleware(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) }))
	mux.HandleFunc("POST /workspace/set-ai-principles", corsMiddleware(handler.HandleSetActiveAIPrinciples))
	mux.HandleFunc("OPTIONS /workspace/set-ai-principles", corsMiddleware(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) }))
	mux.HandleFunc("POST /capability-files", corsMiddleware(handler.HandleCapabilityFiles))
	mux.HandleFunc("OPTIONS /capability-files", corsMiddleware(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) }))
	mux.HandleFunc("POST /enabler-files", corsMiddleware(handler.HandleEnablerFiles))
	mux.HandleFunc("OPTIONS /enabler-files", corsMiddleware(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) }))
	mux.HandleFunc("POST /test-scenario-files", corsMiddleware(handler.HandleTestScenarioFiles))
	mux.HandleFunc("OPTIONS /test-scenario-files", corsMiddleware(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) }))
	mux.HandleFunc("POST /save-capability", corsMiddleware(handler.HandleSaveCapability))
	mux.HandleFunc("OPTIONS /save-capability", corsMiddleware(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) }))
	mux.HandleFunc("POST /update-capability-storyboard", corsMiddleware(handler.HandleUpdateCapabilityStoryboard))
	mux.HandleFunc("OPTIONS /update-capability-storyboard", corsMiddleware(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) }))
	mux.HandleFunc("POST /update-enabler-capability", corsMiddleware(handler.HandleUpdateEnablerCapability))
	mux.HandleFunc("OPTIONS /update-enabler-capability", corsMiddleware(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) }))
	mux.HandleFunc("POST /delete-capability", corsMiddleware(handler.HandleDeleteCapability))
	mux.HandleFunc("OPTIONS /delete-capability", corsMiddleware(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) }))
	mux.HandleFunc("POST /delete-enabler", corsMiddleware(handler.HandleDeleteEnabler))
	mux.HandleFunc("OPTIONS /delete-enabler", corsMiddleware(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) }))
	mux.HandleFunc("POST /delete-specification", corsMiddleware(handler.HandleDeleteSpecification))
	mux.HandleFunc("OPTIONS /delete-specification", corsMiddleware(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) }))
	mux.HandleFunc("POST /story-files", corsMiddleware(handler.HandleStoryFiles))
	mux.HandleFunc("OPTIONS /story-files", corsMiddleware(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) }))
	mux.HandleFunc("POST /ideation-files", corsMiddleware(handler.HandleIdeationFiles))
	mux.HandleFunc("OPTIONS /ideation-files", corsMiddleware(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) }))
	mux.HandleFunc("POST /analyze-storyboard", corsMiddleware(handler.HandleAnalyzeStoryboard))
	mux.HandleFunc("OPTIONS /analyze-storyboard", corsMiddleware(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) }))
	mux.HandleFunc("POST /ai-chat", corsMiddleware(handler.HandleAIChat))
	mux.HandleFunc("OPTIONS /ai-chat", corsMiddleware(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) }))
	mux.HandleFunc("POST /generate-code", corsMiddleware(handler.HandleGenerateCode))
	mux.HandleFunc("OPTIONS /generate-code", corsMiddleware(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) }))
	mux.HandleFunc("POST /generate-code-cli", corsMiddleware(handler.HandleGenerateCodeCLI))
	mux.HandleFunc("OPTIONS /generate-code-cli", corsMiddleware(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) }))
	mux.HandleFunc("POST /code-files", corsMiddleware(handler.HandleCodeFiles))
	mux.HandleFunc("OPTIONS /code-files", corsMiddleware(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) }))
	mux.HandleFunc("POST /run-app", corsMiddleware(handler.HandleRunApp))
	mux.HandleFunc("OPTIONS /run-app", corsMiddleware(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) }))
	mux.HandleFunc("POST /stop-app", corsMiddleware(handler.HandleStopApp))
	mux.HandleFunc("OPTIONS /stop-app", corsMiddleware(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) }))
	mux.HandleFunc("POST /check-app-status", corsMiddleware(handler.HandleCheckAppStatus))
	mux.HandleFunc("OPTIONS /check-app-status", corsMiddleware(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) }))
	mux.HandleFunc("POST /activate-ai-preset", corsMiddleware(handler.HandleActivateAIPreset))
	mux.HandleFunc("OPTIONS /activate-ai-preset", corsMiddleware(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) }))
	mux.HandleFunc("POST /save-specifications", corsMiddleware(handler.HandleSaveSpecifications))
	mux.HandleFunc("OPTIONS /save-specifications", corsMiddleware(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) }))
	mux.HandleFunc("POST /read-specification", corsMiddleware(handler.HandleReadSpecification))
	mux.HandleFunc("OPTIONS /read-specification", corsMiddleware(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) }))
	mux.HandleFunc("POST /read-storyboard-files", corsMiddleware(handler.HandleReadStoryboardFiles))
	mux.HandleFunc("OPTIONS /read-storyboard-files", corsMiddleware(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) }))
	mux.HandleFunc("POST /analyze-capabilities", corsMiddleware(handler.HandleAnalyzeCapabilities))
	mux.HandleFunc("OPTIONS /analyze-capabilities", corsMiddleware(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) }))
	mux.HandleFunc("POST /analyze-conception", corsMiddleware(handler.HandleAnalyzeConception))
	mux.HandleFunc("OPTIONS /analyze-conception", corsMiddleware(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) }))
	mux.HandleFunc("POST /save-image", corsMiddleware(handler.HandleSaveImage))
	mux.HandleFunc("OPTIONS /save-image", corsMiddleware(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) }))

	// Test Scenario routes
	mux.HandleFunc("POST /save-test-scenario", corsMiddleware(handler.HandleSaveTestScenario))
	mux.HandleFunc("OPTIONS /save-test-scenario", corsMiddleware(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) }))
	mux.HandleFunc("POST /delete-test-scenario", corsMiddleware(handler.HandleDeleteTestScenario))
	mux.HandleFunc("OPTIONS /delete-test-scenario", corsMiddleware(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) }))
	mux.HandleFunc("POST /list-test-scenarios", corsMiddleware(handler.HandleListTestScenarios))
	mux.HandleFunc("OPTIONS /list-test-scenarios", corsMiddleware(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) }))

	// File reading route (for AI analysis)
	mux.HandleFunc("POST /read-file", corsMiddleware(handler.HandleReadFile))
	mux.HandleFunc("OPTIONS /read-file", corsMiddleware(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) }))

	// SAWai Epic routes (Scaled Agile With AI)
	mux.HandleFunc("POST /epic-files", corsMiddleware(handler.HandleEpicFiles))
	mux.HandleFunc("OPTIONS /epic-files", corsMiddleware(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) }))
	mux.HandleFunc("POST /save-epic", corsMiddleware(handler.HandleSaveEpic))
	mux.HandleFunc("OPTIONS /save-epic", corsMiddleware(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) }))
	mux.HandleFunc("POST /delete-epic", corsMiddleware(handler.HandleDeleteEpic))
	mux.HandleFunc("OPTIONS /delete-epic", corsMiddleware(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) }))

	// SAWai Theme/Vision routes
	mux.HandleFunc("POST /theme-files", corsMiddleware(handler.HandleThemeFiles))
	mux.HandleFunc("OPTIONS /theme-files", corsMiddleware(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) }))
	mux.HandleFunc("POST /save-theme", corsMiddleware(handler.HandleSaveTheme))
	mux.HandleFunc("OPTIONS /save-theme", corsMiddleware(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) }))
	mux.HandleFunc("POST /delete-theme", corsMiddleware(handler.HandleDeleteTheme))
	mux.HandleFunc("OPTIONS /delete-theme", corsMiddleware(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) }))

	// SAWai Feature routes
	mux.HandleFunc("POST /feature-files", corsMiddleware(handler.HandleFeatureFiles))
	mux.HandleFunc("OPTIONS /feature-files", corsMiddleware(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) }))
	mux.HandleFunc("POST /save-feature", corsMiddleware(handler.HandleSaveFeature))
	mux.HandleFunc("OPTIONS /save-feature", corsMiddleware(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) }))
	mux.HandleFunc("POST /delete-feature", corsMiddleware(handler.HandleDeleteFeature))
	mux.HandleFunc("OPTIONS /delete-feature", corsMiddleware(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) }))

	// Workspace configuration routes
	mux.HandleFunc("POST /workspace-config/save", corsMiddleware(handler.HandleSaveWorkspaceConfig))
	mux.HandleFunc("OPTIONS /workspace-config/save", corsMiddleware(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) }))
	mux.HandleFunc("GET /workspace-config/scan", corsMiddleware(handler.HandleScanWorkspaces))
	mux.HandleFunc("OPTIONS /workspace-config/scan", corsMiddleware(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) }))
	mux.HandleFunc("GET /workspace-config", corsMiddleware(handler.HandleGetWorkspaceConfig))
	mux.HandleFunc("OPTIONS /workspace-config", corsMiddleware(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) }))

	// Create server
	// Note: WriteTimeout increased to 5 minutes for long-running AI analysis
	server := &http.Server{
		Addr:         fmt.Sprintf(":%s", port),
		Handler:      mux,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 5 * time.Minute,
		IdleTimeout:  60 * time.Second,
	}

	// Start server in goroutine
	go func() {
		log.Printf("Integration service starting on port %s", port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server failed to start: %v", err)
		}
	}()

	// Wait for interrupt signal for graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Server is shutting down...")

	// Graceful shutdown with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	server.SetKeepAlivesEnabled(false)
	if err := server.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("Server exited")
}
