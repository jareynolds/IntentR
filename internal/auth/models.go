// IntentR — Copyright © 2025 James Reynolds
//
// This file is part of IntentR.
// You may use this file under either:
//   • The AGPLv3 Open Source License, OR
//   • The IntentR Commercial License
// See the LICENSE.AGPL and LICENSE.COMMERCIAL files for details.

package auth

import (
	"time"
)

// User represents a user in the system
type User struct {
	ID           int       `json:"id"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"` // Never send password hash in JSON
	Name         string    `json:"name"`
	Role         string    `json:"role"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
	LastLogin    *time.Time `json:"lastLogin,omitempty"`
	IsActive     bool      `json:"isActive"`
}

// LoginRequest represents a login request
type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// LoginResponse represents a login response with JWT token
type LoginResponse struct {
	Token string `json:"token"`
	User  User   `json:"user"`
}

// CreateUserRequest represents a request to create a new user
type CreateUserRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Name     string `json:"name"`
	Role     string `json:"role"`
}

// UpdateUserRequest represents a request to update a user
type UpdateUserRequest struct {
	Email    *string `json:"email,omitempty"`
	Password *string `json:"password,omitempty"`
	Name     *string `json:"name,omitempty"`
	Role     *string `json:"role,omitempty"`
	IsActive *bool   `json:"isActive,omitempty"`
}

// VerifyTokenResponse represents the response from token verification
type VerifyTokenResponse struct {
	Valid bool `json:"valid"`
	User  User `json:"user,omitempty"`
}

// ErrorResponse represents an error response
type ErrorResponse struct {
	Error string `json:"error"`
}
