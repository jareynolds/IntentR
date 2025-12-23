// IntentR — Copyright © 2025 James Reynolds
//
// This file is part of IntentR.
// You may use this file under either:
//   • The AGPLv3 Open Source License, OR
//   • The IntentR Commercial License
// See the LICENSE.AGPL and LICENSE.COMMERCIAL files for details.

package auth

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"strings"
)

// Handler handles HTTP requests for authentication
type Handler struct {
	service     *Service
	oauthConfig *OAuthConfig
}

// NewHandler creates a new auth handler
func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// SetOAuthConfig sets the OAuth configuration for the handler
func (h *Handler) SetOAuthConfig(config *OAuthConfig) {
	h.oauthConfig = config
}

// respondJSON sends a JSON response
func respondJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

// respondError sends an error response
func respondError(w http.ResponseWriter, status int, message string) {
	respondJSON(w, status, ErrorResponse{Error: message})
}

// Login handles user login
func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.Email == "" || req.Password == "" {
		respondError(w, http.StatusBadRequest, "Email and password are required")
		return
	}

	resp, err := h.service.Authenticate(req.Email, req.Password)
	if err == ErrInvalidCredentials {
		respondError(w, http.StatusUnauthorized, "Invalid email or password")
		return
	}
	if err != nil {
		log.Printf("Login error: %v", err)
		respondError(w, http.StatusInternalServerError, "Internal server error")
		return
	}

	respondJSON(w, http.StatusOK, resp)
}

// VerifyToken verifies a JWT token
func (h *Handler) VerifyToken(w http.ResponseWriter, r *http.Request) {
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		respondError(w, http.StatusUnauthorized, "Authorization header required")
		return
	}

	parts := strings.Split(authHeader, " ")
	if len(parts) != 2 || parts[0] != "Bearer" {
		respondError(w, http.StatusUnauthorized, "Invalid authorization header format")
		return
	}

	token := parts[1]
	claims, err := h.service.VerifyToken(token)
	if err != nil {
		respondError(w, http.StatusUnauthorized, "Invalid or expired token")
		return
	}

	user, err := h.service.GetUserByID(claims.UserID)
	if err != nil {
		respondError(w, http.StatusUnauthorized, "User not found")
		return
	}

	respondJSON(w, http.StatusOK, VerifyTokenResponse{
		Valid: true,
		User:  *user,
	})
}

// GetMe returns the current user's information
func (h *Handler) GetMe(w http.ResponseWriter, r *http.Request) {
	claims := r.Context().Value("claims").(*Claims)

	user, err := h.service.GetUserByID(claims.UserID)
	if err != nil {
		respondError(w, http.StatusNotFound, "User not found")
		return
	}

	respondJSON(w, http.StatusOK, user)
}

// ListUsers returns all users (admin only)
func (h *Handler) ListUsers(w http.ResponseWriter, r *http.Request) {
	users, err := h.service.ListUsers()
	if err != nil {
		log.Printf("List users error: %v", err)
		respondError(w, http.StatusInternalServerError, "Internal server error")
		return
	}

	respondJSON(w, http.StatusOK, users)
}

// CreateUser creates a new user (admin only)
func (h *Handler) CreateUser(w http.ResponseWriter, r *http.Request) {
	var req CreateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.Email == "" || req.Password == "" || req.Name == "" {
		respondError(w, http.StatusBadRequest, "Email, password, and name are required")
		return
	}

	user, err := h.service.CreateUser(&req)
	if err == ErrUserExists {
		respondError(w, http.StatusConflict, "User with this email already exists")
		return
	}
	if err != nil {
		log.Printf("Create user error: %v", err)
		respondError(w, http.StatusInternalServerError, "Internal server error")
		return
	}

	respondJSON(w, http.StatusCreated, user)
}

// UpdateUser updates a user (admin only)
func (h *Handler) UpdateUser(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid user ID")
		return
	}

	var req UpdateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	user, err := h.service.UpdateUser(id, &req)
	if err == ErrUserNotFound {
		respondError(w, http.StatusNotFound, "User not found")
		return
	}
	if err != nil {
		log.Printf("Update user error: %v", err)
		respondError(w, http.StatusInternalServerError, "Internal server error")
		return
	}

	respondJSON(w, http.StatusOK, user)
}

// DeleteUser deletes a user (admin only)
func (h *Handler) DeleteUser(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid user ID")
		return
	}

	err = h.service.DeleteUser(id)
	if err == ErrUserNotFound {
		respondError(w, http.StatusNotFound, "User not found")
		return
	}
	if err != nil {
		log.Printf("Delete user error: %v", err)
		respondError(w, http.StatusInternalServerError, "Internal server error")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// GoogleLogin initiates the Google OAuth flow
func (h *Handler) GoogleLogin(w http.ResponseWriter, r *http.Request) {
	if h.oauthConfig == nil {
		respondError(w, http.StatusInternalServerError, "OAuth not configured")
		return
	}

	state, err := h.oauthConfig.GenerateStateToken()
	if err != nil {
		log.Printf("Failed to generate state token: %v", err)
		respondError(w, http.StatusInternalServerError, "Failed to initiate OAuth flow")
		return
	}

	url := h.oauthConfig.GoogleConfig.AuthCodeURL(state)
	respondJSON(w, http.StatusOK, map[string]string{
		"url": url,
	})
}

// GoogleCallback handles the Google OAuth callback
func (h *Handler) GoogleCallback(w http.ResponseWriter, r *http.Request) {
	if h.oauthConfig == nil {
		respondError(w, http.StatusInternalServerError, "OAuth not configured")
		return
	}

	// Get code and state from query parameters
	code := r.URL.Query().Get("code")
	state := r.URL.Query().Get("state")

	if code == "" || state == "" {
		respondError(w, http.StatusBadRequest, "Missing code or state parameter")
		return
	}

	// Validate state to prevent CSRF
	if !h.oauthConfig.ValidateState(state) {
		respondError(w, http.StatusUnauthorized, "Invalid state parameter")
		return
	}

	// Get user info from Google
	userInfo, err := h.oauthConfig.GetGoogleUserInfo(r.Context(), code)
	if err != nil {
		log.Printf("Failed to get user info: %v", err)
		respondError(w, http.StatusInternalServerError, "Failed to get user information")
		return
	}

	// Check if user exists, create if not
	user, err := h.service.GetUserByEmail(userInfo.Email)
	if err == ErrUserNotFound {
		// Create new user from Google info
		createReq := &CreateUserRequest{
			Email: userInfo.Email,
			Name:  userInfo.Name,
			// For OAuth users, we don't store a password
			Password: "",
			Role:     "user",
		}
		user, err = h.service.CreateOAuthUser(createReq, "google", userInfo.ID)
		if err != nil {
			log.Printf("Failed to create OAuth user: %v", err)
			respondError(w, http.StatusInternalServerError, "Failed to create user")
			return
		}
	} else if err != nil {
		log.Printf("Failed to get user: %v", err)
		respondError(w, http.StatusInternalServerError, "Internal server error")
		return
	}

	// Generate JWT token
	token, err := h.service.GenerateTokenFromCredentials(user.ID, user.Email, user.Role)
	if err != nil {
		log.Printf("Failed to generate token: %v", err)
		respondError(w, http.StatusInternalServerError, "Failed to generate token")
		return
	}

	// Update last login
	if err := h.service.UpdateLastLogin(user.ID); err != nil {
		log.Printf("Failed to update last login: %v", err)
	}

	respondJSON(w, http.StatusOK, &LoginResponse{
		Token: token,
		User:  *user,
	})
}
