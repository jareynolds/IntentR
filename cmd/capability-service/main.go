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
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"syscall"
	"time"

	"github.com/jareynolds/intentr/pkg/database"
	"github.com/jareynolds/intentr/pkg/models"
	"github.com/jareynolds/intentr/pkg/repository"
)

type Server struct {
	capRepo         *repository.CapabilityRepository
	approvalRepo    *repository.ApprovalRepository
	enablerRepo     *repository.EnablerRepository
	criteriaRepo    *repository.AcceptanceCriteriaRepository
	entityStateRepo *repository.EntityStateRepository
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8082"
	}

	// Initialize database connection
	dbHost := os.Getenv("DB_HOST")
	if dbHost == "" {
		dbHost = "localhost"
	}
	dbPort := os.Getenv("DB_PORT")
	if dbPort == "" {
		dbPort = "5432"
	}
	dbUser := os.Getenv("DB_USER")
	if dbUser == "" {
		dbUser = "intentr"
	}
	dbPassword := os.Getenv("DB_PASSWORD")
	if dbPassword == "" {
		dbPassword = "intentr123"
	}
	dbName := os.Getenv("DB_NAME")
	if dbName == "" {
		dbName = "intentr"
	}

	dsn := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		dbHost, dbPort, dbUser, dbPassword, dbName)

	db, err := database.NewPostgresDB(dsn)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	server := &Server{
		capRepo:         repository.NewCapabilityRepository(db.DB),
		approvalRepo:    repository.NewApprovalRepository(db.DB),
		enablerRepo:     repository.NewEnablerRepository(db.DB),
		criteriaRepo:    repository.NewAcceptanceCriteriaRepository(db.DB),
		entityStateRepo: repository.NewEntityStateRepository(db.DB),
	}

	mux := http.NewServeMux()

	// Enable CORS
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

	// Health check endpoint
	mux.HandleFunc("GET /health", corsMiddleware(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{
			"status":  "healthy",
			"service": "capability-service",
		})
	}))
	mux.HandleFunc("OPTIONS /health", corsMiddleware(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	// Capability endpoints
	mux.HandleFunc("GET /capabilities", corsMiddleware(server.handleGetCapabilities))
	mux.HandleFunc("POST /capabilities", corsMiddleware(server.handleCreateCapability))
	mux.HandleFunc("OPTIONS /capabilities", corsMiddleware(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	mux.HandleFunc("GET /capabilities/{id}", corsMiddleware(server.handleGetCapability))
	mux.HandleFunc("PUT /capabilities/{id}", corsMiddleware(server.handleUpdateCapability))
	mux.HandleFunc("DELETE /capabilities/{id}", corsMiddleware(server.handleDeleteCapability))
	mux.HandleFunc("OPTIONS /capabilities/{id}", corsMiddleware(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	// Capability enablers endpoints
	mux.HandleFunc("GET /capabilities/{id}/enablers", corsMiddleware(server.handleGetCapabilityEnablers))
	mux.HandleFunc("OPTIONS /capabilities/{id}/enablers", corsMiddleware(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	// Capability acceptance criteria endpoints
	mux.HandleFunc("GET /capabilities/{id}/criteria", corsMiddleware(server.handleGetCapabilityCriteria))
	mux.HandleFunc("POST /capabilities/{id}/criteria", corsMiddleware(server.handleCreateCapabilityCriteria))
	mux.HandleFunc("OPTIONS /capabilities/{id}/criteria", corsMiddleware(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	// Enabler endpoints
	mux.HandleFunc("GET /enablers", corsMiddleware(server.handleGetEnablers))
	mux.HandleFunc("POST /enablers", corsMiddleware(server.handleCreateEnabler))
	mux.HandleFunc("OPTIONS /enablers", corsMiddleware(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	mux.HandleFunc("GET /enablers/{id}", corsMiddleware(server.handleGetEnabler))
	mux.HandleFunc("PUT /enablers/{id}", corsMiddleware(server.handleUpdateEnabler))
	mux.HandleFunc("DELETE /enablers/{id}", corsMiddleware(server.handleDeleteEnabler))
	mux.HandleFunc("OPTIONS /enablers/{id}", corsMiddleware(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	// Enabler requirements endpoints
	mux.HandleFunc("GET /enablers/{id}/requirements", corsMiddleware(server.handleGetEnablerRequirements))
	mux.HandleFunc("POST /enablers/{id}/requirements", corsMiddleware(server.handleCreateRequirement))
	mux.HandleFunc("OPTIONS /enablers/{id}/requirements", corsMiddleware(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	// Enabler acceptance criteria endpoints
	mux.HandleFunc("GET /enablers/{id}/criteria", corsMiddleware(server.handleGetEnablerCriteria))
	mux.HandleFunc("POST /enablers/{id}/criteria", corsMiddleware(server.handleCreateEnablerCriteria))
	mux.HandleFunc("OPTIONS /enablers/{id}/criteria", corsMiddleware(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	// Requirement endpoints
	mux.HandleFunc("GET /requirements/{id}", corsMiddleware(server.handleGetRequirement))
	mux.HandleFunc("PUT /requirements/{id}", corsMiddleware(server.handleUpdateRequirement))
	mux.HandleFunc("DELETE /requirements/{id}", corsMiddleware(server.handleDeleteRequirement))
	mux.HandleFunc("POST /requirements/{id}/verify", corsMiddleware(server.handleVerifyRequirement))
	mux.HandleFunc("OPTIONS /requirements/{id}", corsMiddleware(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	mux.HandleFunc("OPTIONS /requirements/{id}/verify", corsMiddleware(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	// Acceptance Criteria endpoints
	mux.HandleFunc("GET /criteria", corsMiddleware(server.handleGetAllCriteria))
	mux.HandleFunc("OPTIONS /criteria", corsMiddleware(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	mux.HandleFunc("GET /criteria/{id}", corsMiddleware(server.handleGetCriteria))
	mux.HandleFunc("PUT /criteria/{id}", corsMiddleware(server.handleUpdateCriteria))
	mux.HandleFunc("DELETE /criteria/{id}", corsMiddleware(server.handleDeleteCriteria))
	mux.HandleFunc("POST /criteria/{id}/verify", corsMiddleware(server.handleVerifyCriteria))
	mux.HandleFunc("OPTIONS /criteria/{id}", corsMiddleware(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	mux.HandleFunc("OPTIONS /criteria/{id}/verify", corsMiddleware(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	// Approval endpoints - static paths first to avoid conflicts
	mux.HandleFunc("POST /approvals/request", corsMiddleware(server.handleRequestApproval))
	mux.HandleFunc("GET /approvals/pending", corsMiddleware(server.handleGetPendingApprovals))
	mux.HandleFunc("GET /approvals/rules", corsMiddleware(server.handleGetWorkflowRules))
	mux.HandleFunc("OPTIONS /approvals/request", corsMiddleware(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	mux.HandleFunc("OPTIONS /approvals/pending", corsMiddleware(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	mux.HandleFunc("OPTIONS /approvals/rules", corsMiddleware(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	// Role permissions endpoint - separate path to avoid conflict with /approvals/{id}
	mux.HandleFunc("GET /approval-permissions/{role}", corsMiddleware(server.handleGetUserPermissions))
	mux.HandleFunc("OPTIONS /approval-permissions/{role}", corsMiddleware(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	// Approval action endpoints with numeric ID
	mux.HandleFunc("GET /approvals/{id}", corsMiddleware(server.handleGetApproval))
	mux.HandleFunc("POST /approvals/{id}/approve", corsMiddleware(server.handleApprove))
	mux.HandleFunc("POST /approvals/{id}/reject", corsMiddleware(server.handleReject))
	mux.HandleFunc("POST /approvals/{id}/withdraw", corsMiddleware(server.handleWithdraw))
	mux.HandleFunc("OPTIONS /approvals/{id}", corsMiddleware(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	mux.HandleFunc("OPTIONS /approvals/{id}/approve", corsMiddleware(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	mux.HandleFunc("OPTIONS /approvals/{id}/reject", corsMiddleware(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	mux.HandleFunc("OPTIONS /approvals/{id}/withdraw", corsMiddleware(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	mux.HandleFunc("GET /capabilities/{id}/approvals", corsMiddleware(server.handleGetApprovalHistory))
	mux.HandleFunc("GET /capabilities/{id}/audit-log", corsMiddleware(server.handleGetAuditLog))
	mux.HandleFunc("OPTIONS /capabilities/{id}/approvals", corsMiddleware(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	mux.HandleFunc("OPTIONS /capabilities/{id}/audit-log", corsMiddleware(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	// Entity State endpoints (INTENT State Model)
	mux.HandleFunc("GET /state/workspace/{workspaceId}", corsMiddleware(server.handleGetWorkspaceState))
	mux.HandleFunc("OPTIONS /state/workspace/{workspaceId}", corsMiddleware(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	mux.HandleFunc("GET /state/capability/{capabilityId}", corsMiddleware(server.handleGetCapabilityState))
	mux.HandleFunc("PUT /state/capability/{capabilityId}", corsMiddleware(server.handleUpdateCapabilityState))
	mux.HandleFunc("OPTIONS /state/capability/{capabilityId}", corsMiddleware(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	mux.HandleFunc("GET /state/enabler/{enablerId}", corsMiddleware(server.handleGetEnablerState))
	mux.HandleFunc("PUT /state/enabler/{enablerId}", corsMiddleware(server.handleUpdateEnablerState))
	mux.HandleFunc("OPTIONS /state/enabler/{enablerId}", corsMiddleware(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	mux.HandleFunc("GET /state/storycard/{cardId}", corsMiddleware(server.handleGetStoryCardState))
	mux.HandleFunc("PUT /state/storycard/{cardId}", corsMiddleware(server.handleUpdateStoryCardState))
	mux.HandleFunc("POST /state/storycard", corsMiddleware(server.handleCreateStoryCard))
	mux.HandleFunc("OPTIONS /state/storycard/{cardId}", corsMiddleware(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	mux.HandleFunc("OPTIONS /state/storycard", corsMiddleware(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	mux.HandleFunc("GET /state/history/{entityType}/{entityId}", corsMiddleware(server.handleGetStateHistory))
	mux.HandleFunc("OPTIONS /state/history/{entityType}/{entityId}", corsMiddleware(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	mux.HandleFunc("POST /state/capability/sync", corsMiddleware(server.handleSyncCapabilityFromFile))
	mux.HandleFunc("OPTIONS /state/capability/sync", corsMiddleware(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	mux.HandleFunc("POST /state/enabler/sync", corsMiddleware(server.handleSyncEnablerFromFile))
	mux.HandleFunc("OPTIONS /state/enabler/sync", corsMiddleware(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	mux.HandleFunc("POST /state/storycard/sync", corsMiddleware(server.handleSyncStoryCardFromFile))
	mux.HandleFunc("OPTIONS /state/storycard/sync", corsMiddleware(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	// Export/Import endpoints for workspace portability
	mux.HandleFunc("GET /state/export/{workspaceId}", corsMiddleware(server.handleExportWorkspaceState))
	mux.HandleFunc("OPTIONS /state/export/{workspaceId}", corsMiddleware(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	mux.HandleFunc("POST /state/import/{workspaceId}", corsMiddleware(server.handleImportWorkspaceState))
	mux.HandleFunc("OPTIONS /state/import/{workspaceId}", corsMiddleware(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	httpServer := &http.Server{
		Addr:         fmt.Sprintf(":%s", port),
		Handler:      mux,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		log.Printf("Capability service starting on port %s", port)
		if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server failed to start: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Server is shutting down...")

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	httpServer.SetKeepAlivesEnabled(false)
	if err := httpServer.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	if db != nil {
		db.Close()
	}

	log.Println("Server exited")
}

func (s *Server) handleGetCapabilities(w http.ResponseWriter, r *http.Request) {
	capabilities, err := s.capRepo.GetAll()
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get capabilities: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"capabilities": capabilities,
	})
}

func (s *Server) handleGetCapability(w http.ResponseWriter, r *http.Request) {
	idStr := strings.TrimPrefix(r.URL.Path, "/capabilities/")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid capability ID", http.StatusBadRequest)
		return
	}

	capability, err := s.capRepo.GetByID(id)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get capability: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(capability)
}

func (s *Server) handleCreateCapability(w http.ResponseWriter, r *http.Request) {
	var req models.CreateCapabilityRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, fmt.Sprintf("Invalid request body: %v", err), http.StatusBadRequest)
		return
	}

	// For now, use a default user ID (1 = admin)
	// In production, this should come from authentication middleware
	userID := 1

	capability, err := s.capRepo.Create(req, userID)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to create capability: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(capability)
}

func (s *Server) handleUpdateCapability(w http.ResponseWriter, r *http.Request) {
	idStr := strings.TrimPrefix(r.URL.Path, "/capabilities/")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid capability ID", http.StatusBadRequest)
		return
	}

	var req models.UpdateCapabilityRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, fmt.Sprintf("Invalid request body: %v", err), http.StatusBadRequest)
		return
	}

	capability, err := s.capRepo.Update(id, req)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to update capability: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(capability)
}

func (s *Server) handleDeleteCapability(w http.ResponseWriter, r *http.Request) {
	idStr := strings.TrimPrefix(r.URL.Path, "/capabilities/")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid capability ID", http.StatusBadRequest)
		return
	}

	if err := s.capRepo.Delete(id); err != nil {
		http.Error(w, fmt.Sprintf("Failed to delete capability: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": "Capability deleted successfully",
	})
}

// Approval Handlers

func (s *Server) handleRequestApproval(w http.ResponseWriter, r *http.Request) {
	var req models.RequestApprovalRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, fmt.Sprintf("Invalid request body: %v", err), http.StatusBadRequest)
		return
	}

	// Validate stage
	if !models.IsValidStage(req.Stage) {
		http.Error(w, "Invalid stage. Must be one of: specification, definition, design, execution", http.StatusBadRequest)
		return
	}

	// For now, use a default user ID (1 = admin)
	// In production, this should come from authentication middleware
	userID := 1

	approval, err := s.approvalRepo.RequestApproval(req.CapabilityID, req.Stage, userID)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to request approval: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(approval)
}

func (s *Server) handleGetPendingApprovals(w http.ResponseWriter, r *http.Request) {
	approvals, err := s.approvalRepo.GetPendingApprovals()
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get pending approvals: %v", err), http.StatusInternalServerError)
		return
	}

	// Calculate counts by stage
	byStage := make(map[string]int)
	for _, a := range approvals {
		byStage[string(a.Stage)]++
	}

	response := models.PendingApprovalsResponse{
		Approvals:  make([]models.ApprovalResponse, len(approvals)),
		TotalCount: len(approvals),
		ByStage:    byStage,
	}

	// Enrich each approval with capability name and permissions
	for i, a := range approvals {
		cap, _ := s.capRepo.GetByID(a.CapabilityID)
		capName := ""
		if cap != nil {
			capName = cap.Name
		}

		response.Approvals[i] = models.ApprovalResponse{
			Approval:       &approvals[i],
			CapabilityName: capName,
			CanApprove:     true,  // Would check user permissions in production
			CanReject:      true,  // Would check user permissions in production
			CanWithdraw:    false, // Only requester can withdraw
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func (s *Server) handleGetApproval(w http.ResponseWriter, r *http.Request) {
	idStr := extractIDFromPath(r.URL.Path, "/approvals/")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid approval ID", http.StatusBadRequest)
		return
	}

	approval, err := s.approvalRepo.GetApprovalByID(id)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get approval: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(approval)
}

func (s *Server) handleApprove(w http.ResponseWriter, r *http.Request) {
	// Extract approval ID from path like /approvals/123/approve
	path := r.URL.Path
	path = strings.TrimPrefix(path, "/approvals/")
	path = strings.TrimSuffix(path, "/approve")
	id, err := strconv.Atoi(path)
	if err != nil {
		http.Error(w, "Invalid approval ID", http.StatusBadRequest)
		return
	}

	var req models.ApprovalDecisionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		// Feedback is optional for approval, so ignore decode errors
		req = models.ApprovalDecisionRequest{}
	}

	// For now, use a default user ID (1 = admin)
	userID := 1

	approval, err := s.approvalRepo.Approve(id, userID, req.Feedback)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to approve: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(approval)
}

func (s *Server) handleReject(w http.ResponseWriter, r *http.Request) {
	// Extract approval ID from path like /approvals/123/reject
	path := r.URL.Path
	path = strings.TrimPrefix(path, "/approvals/")
	path = strings.TrimSuffix(path, "/reject")
	id, err := strconv.Atoi(path)
	if err != nil {
		http.Error(w, "Invalid approval ID", http.StatusBadRequest)
		return
	}

	var req models.ApprovalDecisionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, fmt.Sprintf("Invalid request body: %v", err), http.StatusBadRequest)
		return
	}

	if req.Feedback == "" {
		http.Error(w, "Feedback is required when rejecting", http.StatusBadRequest)
		return
	}

	// For now, use a default user ID (1 = admin)
	userID := 1

	approval, err := s.approvalRepo.Reject(id, userID, req.Feedback)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to reject: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(approval)
}

func (s *Server) handleWithdraw(w http.ResponseWriter, r *http.Request) {
	// Extract approval ID from path like /approvals/123/withdraw
	path := r.URL.Path
	path = strings.TrimPrefix(path, "/approvals/")
	path = strings.TrimSuffix(path, "/withdraw")
	id, err := strconv.Atoi(path)
	if err != nil {
		http.Error(w, "Invalid approval ID", http.StatusBadRequest)
		return
	}

	// For now, use a default user ID (1 = admin)
	userID := 1

	approval, err := s.approvalRepo.Withdraw(id, userID)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to withdraw: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(approval)
}

func (s *Server) handleGetApprovalHistory(w http.ResponseWriter, r *http.Request) {
	// Extract capability ID from path like /capabilities/123/approvals
	path := r.URL.Path
	path = strings.TrimPrefix(path, "/capabilities/")
	path = strings.TrimSuffix(path, "/approvals")
	id, err := strconv.Atoi(path)
	if err != nil {
		http.Error(w, "Invalid capability ID", http.StatusBadRequest)
		return
	}

	approvals, err := s.approvalRepo.GetApprovalHistory(id)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get approval history: %v", err), http.StatusInternalServerError)
		return
	}

	// Get capability details
	cap, _ := s.capRepo.GetByID(id)
	capName := ""
	currentStage := "specification"
	currentStatus := "draft"
	if cap != nil {
		capName = cap.Name
		// These would come from the capability if we had added those fields
	}

	response := models.ApprovalHistoryResponse{
		CapabilityID:   id,
		CapabilityName: capName,
		CurrentStage:   currentStage,
		CurrentStatus:  currentStatus,
		Approvals:      approvals,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func (s *Server) handleGetAuditLog(w http.ResponseWriter, r *http.Request) {
	// Extract capability ID from path like /capabilities/123/audit-log
	path := r.URL.Path
	path = strings.TrimPrefix(path, "/capabilities/")
	path = strings.TrimSuffix(path, "/audit-log")
	id, err := strconv.Atoi(path)
	if err != nil {
		http.Error(w, "Invalid capability ID", http.StatusBadRequest)
		return
	}

	logs, err := s.approvalRepo.GetAuditLog(id)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get audit log: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"capability_id": id,
		"audit_log":     logs,
	})
}

func (s *Server) handleGetWorkflowRules(w http.ResponseWriter, r *http.Request) {
	rules, err := s.approvalRepo.GetWorkflowRules()
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get workflow rules: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"rules": rules,
	})
}

func (s *Server) handleGetUserPermissions(w http.ResponseWriter, r *http.Request) {
	role := strings.TrimPrefix(r.URL.Path, "/approval-permissions/")

	permissions, err := s.approvalRepo.GetUserPermissions(role)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get permissions: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(permissions)
}

// Helper function to extract ID from path
func extractIDFromPath(path, prefix string) string {
	path = strings.TrimPrefix(path, prefix)
	// Handle paths like /approvals/123/action by taking only the numeric part
	parts := strings.Split(path, "/")
	if len(parts) > 0 {
		return parts[0]
	}
	return path
}

// =====================================================
// Enabler Handlers
// =====================================================

func (s *Server) handleGetEnablers(w http.ResponseWriter, r *http.Request) {
	enablers, err := s.enablerRepo.GetAll()
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get enablers: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"enablers": enablers,
	})
}

func (s *Server) handleGetEnabler(w http.ResponseWriter, r *http.Request) {
	idStr := extractIDFromPath(r.URL.Path, "/enablers/")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid enabler ID", http.StatusBadRequest)
		return
	}

	enabler, err := s.enablerRepo.GetByID(id)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get enabler: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(enabler)
}

func (s *Server) handleCreateEnabler(w http.ResponseWriter, r *http.Request) {
	var req models.CreateEnablerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, fmt.Sprintf("Invalid request body: %v", err), http.StatusBadRequest)
		return
	}

	userID := 1 // Default user ID

	enabler, err := s.enablerRepo.Create(req, userID)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to create enabler: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(enabler)
}

func (s *Server) handleUpdateEnabler(w http.ResponseWriter, r *http.Request) {
	idStr := extractIDFromPath(r.URL.Path, "/enablers/")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid enabler ID", http.StatusBadRequest)
		return
	}

	var req models.UpdateEnablerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, fmt.Sprintf("Invalid request body: %v", err), http.StatusBadRequest)
		return
	}

	enabler, err := s.enablerRepo.Update(id, req)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to update enabler: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(enabler)
}

func (s *Server) handleDeleteEnabler(w http.ResponseWriter, r *http.Request) {
	idStr := extractIDFromPath(r.URL.Path, "/enablers/")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid enabler ID", http.StatusBadRequest)
		return
	}

	if err := s.enablerRepo.Delete(id); err != nil {
		http.Error(w, fmt.Sprintf("Failed to delete enabler: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": "Enabler deleted successfully",
	})
}

func (s *Server) handleGetCapabilityEnablers(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Path
	path = strings.TrimPrefix(path, "/capabilities/")
	path = strings.TrimSuffix(path, "/enablers")
	id, err := strconv.Atoi(path)
	if err != nil {
		http.Error(w, "Invalid capability ID", http.StatusBadRequest)
		return
	}

	enablers, err := s.enablerRepo.GetByCapabilityID(id)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get enablers: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"capability_id": id,
		"enablers":      enablers,
	})
}

// =====================================================
// Requirement Handlers
// =====================================================

func (s *Server) handleGetEnablerRequirements(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Path
	path = strings.TrimPrefix(path, "/enablers/")
	path = strings.TrimSuffix(path, "/requirements")
	id, err := strconv.Atoi(path)
	if err != nil {
		http.Error(w, "Invalid enabler ID", http.StatusBadRequest)
		return
	}

	enabler, err := s.enablerRepo.GetByID(id)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get enabler: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"enabler_id":   id,
		"requirements": enabler.Requirements,
	})
}

func (s *Server) handleCreateRequirement(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Path
	path = strings.TrimPrefix(path, "/enablers/")
	path = strings.TrimSuffix(path, "/requirements")
	enablerID, err := strconv.Atoi(path)
	if err != nil {
		http.Error(w, "Invalid enabler ID", http.StatusBadRequest)
		return
	}

	var req models.CreateRequirementRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, fmt.Sprintf("Invalid request body: %v", err), http.StatusBadRequest)
		return
	}

	req.EnablerID = enablerID
	userID := 1 // Default user ID

	requirement, err := s.enablerRepo.CreateRequirement(req, userID)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to create requirement: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(requirement)
}

func (s *Server) handleGetRequirement(w http.ResponseWriter, r *http.Request) {
	idStr := extractIDFromPath(r.URL.Path, "/requirements/")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid requirement ID", http.StatusBadRequest)
		return
	}

	requirement, err := s.enablerRepo.GetRequirementByID(id)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get requirement: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(requirement)
}

func (s *Server) handleUpdateRequirement(w http.ResponseWriter, r *http.Request) {
	idStr := extractIDFromPath(r.URL.Path, "/requirements/")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid requirement ID", http.StatusBadRequest)
		return
	}

	var req models.UpdateRequirementRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, fmt.Sprintf("Invalid request body: %v", err), http.StatusBadRequest)
		return
	}

	requirement, err := s.enablerRepo.UpdateRequirement(id, req)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to update requirement: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(requirement)
}

func (s *Server) handleDeleteRequirement(w http.ResponseWriter, r *http.Request) {
	idStr := extractIDFromPath(r.URL.Path, "/requirements/")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid requirement ID", http.StatusBadRequest)
		return
	}

	if err := s.enablerRepo.DeleteRequirement(id); err != nil {
		http.Error(w, fmt.Sprintf("Failed to delete requirement: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": "Requirement deleted successfully",
	})
}

func (s *Server) handleVerifyRequirement(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Path
	path = strings.TrimPrefix(path, "/requirements/")
	path = strings.TrimSuffix(path, "/verify")
	id, err := strconv.Atoi(path)
	if err != nil {
		http.Error(w, "Invalid requirement ID", http.StatusBadRequest)
		return
	}

	var req models.VerifyRequirementRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, fmt.Sprintf("Invalid request body: %v", err), http.StatusBadRequest)
		return
	}

	userID := 1 // Default user ID

	requirement, err := s.enablerRepo.VerifyRequirement(id, userID, req)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to verify requirement: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(requirement)
}

// =====================================================
// Acceptance Criteria Handlers
// =====================================================

func (s *Server) handleGetAllCriteria(w http.ResponseWriter, r *http.Request) {
	entityType := r.URL.Query().Get("entity_type")
	status := r.URL.Query().Get("status")

	criteria, err := s.criteriaRepo.GetAll(entityType, status)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get criteria: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"criteria": criteria,
	})
}

func (s *Server) handleGetCriteria(w http.ResponseWriter, r *http.Request) {
	idStr := extractIDFromPath(r.URL.Path, "/criteria/")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid criteria ID", http.StatusBadRequest)
		return
	}

	criteria, err := s.criteriaRepo.GetByID(id)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get criteria: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(criteria)
}

func (s *Server) handleUpdateCriteria(w http.ResponseWriter, r *http.Request) {
	idStr := extractIDFromPath(r.URL.Path, "/criteria/")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid criteria ID", http.StatusBadRequest)
		return
	}

	var req models.UpdateAcceptanceCriteriaRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, fmt.Sprintf("Invalid request body: %v", err), http.StatusBadRequest)
		return
	}

	criteria, err := s.criteriaRepo.Update(id, req)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to update criteria: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(criteria)
}

func (s *Server) handleDeleteCriteria(w http.ResponseWriter, r *http.Request) {
	idStr := extractIDFromPath(r.URL.Path, "/criteria/")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid criteria ID", http.StatusBadRequest)
		return
	}

	if err := s.criteriaRepo.Delete(id); err != nil {
		http.Error(w, fmt.Sprintf("Failed to delete criteria: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": "Criteria deleted successfully",
	})
}

func (s *Server) handleVerifyCriteria(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Path
	path = strings.TrimPrefix(path, "/criteria/")
	path = strings.TrimSuffix(path, "/verify")
	id, err := strconv.Atoi(path)
	if err != nil {
		http.Error(w, "Invalid criteria ID", http.StatusBadRequest)
		return
	}

	var req models.VerifyAcceptanceCriteriaRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, fmt.Sprintf("Invalid request body: %v", err), http.StatusBadRequest)
		return
	}

	userID := 1 // Default user ID

	criteria, err := s.criteriaRepo.Verify(id, userID, req)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to verify criteria: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(criteria)
}

func (s *Server) handleGetCapabilityCriteria(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Path
	path = strings.TrimPrefix(path, "/capabilities/")
	path = strings.TrimSuffix(path, "/criteria")
	id, err := strconv.Atoi(path)
	if err != nil {
		http.Error(w, "Invalid capability ID", http.StatusBadRequest)
		return
	}

	criteria, err := s.criteriaRepo.GetByEntity("capability", id)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get criteria: %v", err), http.StatusInternalServerError)
		return
	}

	summary, _ := s.criteriaRepo.GetSummary("capability", id)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"capability_id": id,
		"criteria":      criteria,
		"summary":       summary,
	})
}

func (s *Server) handleCreateCapabilityCriteria(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Path
	path = strings.TrimPrefix(path, "/capabilities/")
	path = strings.TrimSuffix(path, "/criteria")
	capabilityID, err := strconv.Atoi(path)
	if err != nil {
		http.Error(w, "Invalid capability ID", http.StatusBadRequest)
		return
	}

	var req models.CreateAcceptanceCriteriaRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, fmt.Sprintf("Invalid request body: %v", err), http.StatusBadRequest)
		return
	}

	req.EntityType = "capability"
	req.EntityID = capabilityID
	userID := 1 // Default user ID

	criteria, err := s.criteriaRepo.Create(req, userID)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to create criteria: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(criteria)
}

func (s *Server) handleGetEnablerCriteria(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Path
	path = strings.TrimPrefix(path, "/enablers/")
	path = strings.TrimSuffix(path, "/criteria")
	id, err := strconv.Atoi(path)
	if err != nil {
		http.Error(w, "Invalid enabler ID", http.StatusBadRequest)
		return
	}

	criteria, err := s.criteriaRepo.GetByEntity("enabler", id)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get criteria: %v", err), http.StatusInternalServerError)
		return
	}

	summary, _ := s.criteriaRepo.GetSummary("enabler", id)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"enabler_id": id,
		"criteria":   criteria,
		"summary":    summary,
	})
}

func (s *Server) handleCreateEnablerCriteria(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Path
	path = strings.TrimPrefix(path, "/enablers/")
	path = strings.TrimSuffix(path, "/criteria")
	enablerID, err := strconv.Atoi(path)
	if err != nil {
		http.Error(w, "Invalid enabler ID", http.StatusBadRequest)
		return
	}

	var req models.CreateAcceptanceCriteriaRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, fmt.Sprintf("Invalid request body: %v", err), http.StatusBadRequest)
		return
	}

	req.EntityType = "enabler"
	req.EntityID = enablerID
	userID := 1 // Default user ID

	criteria, err := s.criteriaRepo.Create(req, userID)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to create criteria: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(criteria)
}

// =====================================================
// Entity State Handlers (INTENT State Model)
// =====================================================

func (s *Server) handleGetWorkspaceState(w http.ResponseWriter, r *http.Request) {
	workspaceID := r.PathValue("workspaceId")
	if workspaceID == "" {
		http.Error(w, "Workspace ID is required", http.StatusBadRequest)
		return
	}

	state, err := s.entityStateRepo.GetAllStateByWorkspace(workspaceID)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get workspace state: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(state)
}

func (s *Server) handleGetCapabilityState(w http.ResponseWriter, r *http.Request) {
	capabilityID := r.PathValue("capabilityId")
	if capabilityID == "" {
		http.Error(w, "Capability ID is required", http.StatusBadRequest)
		return
	}

	state, err := s.entityStateRepo.GetCapabilityState(capabilityID)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get capability state: %v", err), http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(state)
}

func (s *Server) handleUpdateCapabilityState(w http.ResponseWriter, r *http.Request) {
	capabilityID := r.PathValue("capabilityId")
	if capabilityID == "" {
		http.Error(w, "Capability ID is required", http.StatusBadRequest)
		return
	}

	var req models.UpdateEntityStateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, fmt.Sprintf("Invalid request body: %v", err), http.StatusBadRequest)
		return
	}

	userID := 1 // Default user ID

	state, err := s.entityStateRepo.UpdateCapabilityState(capabilityID, req, &userID)
	if err != nil {
		// Check if it's an optimistic lock error
		if _, ok := err.(*models.OptimisticLockError); ok {
			http.Error(w, err.Error(), http.StatusConflict)
			return
		}
		http.Error(w, fmt.Sprintf("Failed to update capability state: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(state)
}

func (s *Server) handleGetEnablerState(w http.ResponseWriter, r *http.Request) {
	enablerID := r.PathValue("enablerId")
	if enablerID == "" {
		http.Error(w, "Enabler ID is required", http.StatusBadRequest)
		return
	}

	state, err := s.entityStateRepo.GetEnablerState(enablerID)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get enabler state: %v", err), http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(state)
}

func (s *Server) handleUpdateEnablerState(w http.ResponseWriter, r *http.Request) {
	enablerID := r.PathValue("enablerId")
	if enablerID == "" {
		http.Error(w, "Enabler ID is required", http.StatusBadRequest)
		return
	}

	var req models.UpdateEntityStateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, fmt.Sprintf("Invalid request body: %v", err), http.StatusBadRequest)
		return
	}

	userID := 1 // Default user ID

	state, err := s.entityStateRepo.UpdateEnablerState(enablerID, req, &userID)
	if err != nil {
		if _, ok := err.(*models.OptimisticLockError); ok {
			http.Error(w, err.Error(), http.StatusConflict)
			return
		}
		http.Error(w, fmt.Sprintf("Failed to update enabler state: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(state)
}

func (s *Server) handleGetStoryCardState(w http.ResponseWriter, r *http.Request) {
	cardID := r.PathValue("cardId")
	if cardID == "" {
		http.Error(w, "Card ID is required", http.StatusBadRequest)
		return
	}

	state, err := s.entityStateRepo.GetStoryCardState(cardID)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get story card state: %v", err), http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(state)
}

func (s *Server) handleUpdateStoryCardState(w http.ResponseWriter, r *http.Request) {
	cardID := r.PathValue("cardId")
	if cardID == "" {
		http.Error(w, "Card ID is required", http.StatusBadRequest)
		return
	}

	var req models.UpdateEntityStateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, fmt.Sprintf("Invalid request body: %v", err), http.StatusBadRequest)
		return
	}

	userID := 1 // Default user ID

	state, err := s.entityStateRepo.UpdateStoryCardState(cardID, req, &userID)
	if err != nil {
		if _, ok := err.(*models.OptimisticLockError); ok {
			http.Error(w, err.Error(), http.StatusConflict)
			return
		}
		http.Error(w, fmt.Sprintf("Failed to update story card state: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(state)
}

func (s *Server) handleCreateStoryCard(w http.ResponseWriter, r *http.Request) {
	var req models.CreateStoryCardRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, fmt.Sprintf("Invalid request body: %v", err), http.StatusBadRequest)
		return
	}

	userID := 1 // Default user ID

	card, err := s.entityStateRepo.CreateStoryCard(req, &userID)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to create story card: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(card)
}

func (s *Server) handleGetStateHistory(w http.ResponseWriter, r *http.Request) {
	entityType := r.PathValue("entityType")
	entityID := r.PathValue("entityId")

	if entityType == "" || entityID == "" {
		http.Error(w, "Entity type and ID are required", http.StatusBadRequest)
		return
	}

	limitStr := r.URL.Query().Get("limit")
	limit := 50 // Default limit
	if limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			limit = l
		}
	}

	history, err := s.entityStateRepo.GetStateChangeHistory(entityType, entityID, limit)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get state history: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"entity_type": entityType,
		"entity_id":   entityID,
		"history":     history,
	})
}

func (s *Server) handleSyncCapabilityFromFile(w http.ResponseWriter, r *http.Request) {
	var cap models.Capability
	if err := json.NewDecoder(r.Body).Decode(&cap); err != nil {
		http.Error(w, fmt.Sprintf("Invalid request body: %v", err), http.StatusBadRequest)
		return
	}

	userID := 1 // Default user ID

	result, err := s.entityStateRepo.UpsertCapabilityFromFile(cap, &userID)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to sync capability: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

func (s *Server) handleSyncEnablerFromFile(w http.ResponseWriter, r *http.Request) {
	var enabler models.Enabler
	if err := json.NewDecoder(r.Body).Decode(&enabler); err != nil {
		http.Error(w, fmt.Sprintf("Invalid request body: %v", err), http.StatusBadRequest)
		return
	}

	userID := 1 // Default user ID

	result, err := s.entityStateRepo.UpsertEnablerFromFile(enabler, &userID)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to sync enabler: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

func (s *Server) handleSyncStoryCardFromFile(w http.ResponseWriter, r *http.Request) {
	var storyCard models.StoryCard
	if err := json.NewDecoder(r.Body).Decode(&storyCard); err != nil {
		http.Error(w, fmt.Sprintf("Invalid request body: %v", err), http.StatusBadRequest)
		return
	}

	userID := 1 // Default user ID

	result, err := s.entityStateRepo.UpsertStoryCard(storyCard, &userID)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to sync story card: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

// WorkspaceStateExport represents the exported state of a workspace
type WorkspaceStateExport struct {
	Version      string                `json:"version"`
	ExportedAt   time.Time             `json:"exported_at"`
	WorkspaceID  string                `json:"workspace_id"`
	Capabilities []models.Capability   `json:"capabilities"`
	Enablers     []models.Enabler      `json:"enablers"`
	StoryCards   []models.StoryCard    `json:"story_cards"`
	StateChanges []models.EntityStateChange `json:"state_changes,omitempty"`
}

func (s *Server) handleExportWorkspaceState(w http.ResponseWriter, r *http.Request) {
	workspaceID := r.PathValue("workspaceId")
	if workspaceID == "" {
		http.Error(w, "Workspace ID is required", http.StatusBadRequest)
		return
	}

	// Get all entity states for the workspace
	bulkState, err := s.entityStateRepo.GetAllStateByWorkspace(workspaceID)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get workspace state: %v", err), http.StatusInternalServerError)
		return
	}

	// Include state change history (optional, limited)
	includeHistory := r.URL.Query().Get("include_history") == "true"
	var stateChanges []models.EntityStateChange
	if includeHistory {
		// Get recent state changes for all entities in workspace
		// This is a simplified approach - you could make it more comprehensive
		stateChanges = []models.EntityStateChange{}
	}

	export := WorkspaceStateExport{
		Version:      "1.0",
		ExportedAt:   time.Now(),
		WorkspaceID:  workspaceID,
		Capabilities: bulkState.Capabilities,
		Enablers:     bulkState.Enablers,
		StoryCards:   bulkState.StoryCards,
		StateChanges: stateChanges,
	}

	// Set headers for download
	filename := fmt.Sprintf("workspace_%s_state_%s.json", workspaceID, time.Now().Format("2006-01-02"))
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))

	encoder := json.NewEncoder(w)
	encoder.SetIndent("", "  ")
	encoder.Encode(export)
}

func (s *Server) handleImportWorkspaceState(w http.ResponseWriter, r *http.Request) {
	workspaceID := r.PathValue("workspaceId")
	if workspaceID == "" {
		http.Error(w, "Workspace ID is required", http.StatusBadRequest)
		return
	}

	var importData WorkspaceStateExport
	if err := json.NewDecoder(r.Body).Decode(&importData); err != nil {
		http.Error(w, fmt.Sprintf("Invalid import data: %v", err), http.StatusBadRequest)
		return
	}

	userID := 1 // Default user ID

	// Import capabilities
	importedCaps := 0
	for _, cap := range importData.Capabilities {
		cap.WorkspaceID = workspaceID // Override with target workspace
		_, err := s.entityStateRepo.UpsertCapabilityFromFile(cap, &userID)
		if err != nil {
			log.Printf("Warning: Failed to import capability %s: %v", cap.CapabilityID, err)
			continue
		}
		importedCaps++
	}

	// Import enablers
	importedEnbs := 0
	for _, enb := range importData.Enablers {
		enb.WorkspaceID = workspaceID // Override with target workspace
		_, err := s.entityStateRepo.UpsertEnablerFromFile(enb, &userID)
		if err != nil {
			log.Printf("Warning: Failed to import enabler %s: %v", enb.EnablerID, err)
			continue
		}
		importedEnbs++
	}

	// Import story cards
	importedCards := 0
	for _, card := range importData.StoryCards {
		card.WorkspaceID = workspaceID // Override with target workspace
		_, err := s.entityStateRepo.UpsertStoryCard(card, &userID)
		if err != nil {
			log.Printf("Warning: Failed to import story card %s: %v", card.CardID, err)
			continue
		}
		importedCards++
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"imported": map[string]int{
			"capabilities": importedCaps,
			"enablers":     importedEnbs,
			"story_cards":  importedCards,
		},
		"workspace_id": workspaceID,
	})
}
