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
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/jareynolds/intentr/internal/auth"
	"github.com/jareynolds/intentr/pkg/database"
	"github.com/jareynolds/intentr/pkg/middleware"
)

func main() {
	// Get configuration from environment
	port := os.Getenv("PORT")
	if port == "" {
		port = "8083"
	}

	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		log.Fatal("DATABASE_URL environment variable is required")
	}

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		log.Fatal("JWT_SECRET environment variable is required")
	}

	// OAuth configuration (optional)
	googleClientID := os.Getenv("GOOGLE_CLIENT_ID")
	googleClientSecret := os.Getenv("GOOGLE_CLIENT_SECRET")
	googleRedirectURL := os.Getenv("GOOGLE_REDIRECT_URL")
	if googleRedirectURL == "" {
		googleRedirectURL = "http://localhost:3000/auth/google/callback"
	}

	// Connect to database
	db, err := database.NewPostgresDB(databaseURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Initialize service and handler
	authService := auth.NewService(db.DB, jwtSecret)
	authHandler := auth.NewHandler(authService)

	// Configure OAuth if credentials are provided
	if googleClientID != "" && googleClientSecret != "" {
		oauthConfig := auth.NewOAuthConfig(googleClientID, googleClientSecret, googleRedirectURL)
		authHandler.SetOAuthConfig(oauthConfig)
		log.Println("Google OAuth configured successfully")
	} else {
		log.Println("Google OAuth not configured (missing client ID or secret)")
	}

	// Setup routes
	mux := http.NewServeMux()

	// Public endpoints
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok"}`))
	})
	mux.HandleFunc("POST /api/auth/login", authHandler.Login)
	mux.HandleFunc("GET /api/auth/verify", authHandler.VerifyToken)

	// OAuth endpoints
	mux.HandleFunc("GET /api/auth/google/login", authHandler.GoogleLogin)
	mux.HandleFunc("GET /api/auth/google/callback", authHandler.GoogleCallback)

	// Protected endpoints (require authentication)
	authMiddleware := middleware.AuthMiddleware(authService)
	mux.Handle("GET /api/auth/me", authMiddleware(http.HandlerFunc(authHandler.GetMe)))

	// Admin-only endpoints
	adminOnly := middleware.AdminOnlyMiddleware
	mux.Handle("GET /api/users", authMiddleware(adminOnly(http.HandlerFunc(authHandler.ListUsers))))
	mux.Handle("POST /api/users", authMiddleware(adminOnly(http.HandlerFunc(authHandler.CreateUser))))
	mux.Handle("PUT /api/users/{id}", authMiddleware(adminOnly(http.HandlerFunc(authHandler.UpdateUser))))
	mux.Handle("DELETE /api/users/{id}", authMiddleware(adminOnly(http.HandlerFunc(authHandler.DeleteUser))))

	// Apply CORS middleware
	handler := middleware.CORS(mux)

	// Create server
	server := &http.Server{
		Addr:         ":" + port,
		Handler:      handler,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start server in a goroutine
	go func() {
		log.Printf("Auth service starting on port %s", port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server failed: %v", err)
		}
	}()

	// Wait for interrupt signal to gracefully shutdown the server
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("Server exited")
}
