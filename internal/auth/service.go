// IntentR — Copyright © 2025 James Reynolds
//
// This file is part of IntentR.
// You may use this file under either:
//   • The AGPLv3 Open Source License, OR
//   • The IntentR Commercial License
// See the LICENSE.AGPL and LICENSE.COMMERCIAL files for details.

package auth

import (
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

var (
	ErrInvalidCredentials = errors.New("invalid email or password")
	ErrUserNotFound       = errors.New("user not found")
	ErrUserExists         = errors.New("user with this email already exists")
	ErrInvalidToken       = errors.New("invalid token")
	ErrUnauthorized       = errors.New("unauthorized")
)

// Service handles authentication operations
type Service struct {
	db        *sql.DB
	jwtSecret []byte
}

// NewService creates a new auth service
func NewService(db *sql.DB, jwtSecret string) *Service {
	return &Service{
		db:        db,
		jwtSecret: []byte(jwtSecret),
	}
}

// Claims represents JWT claims
type Claims struct {
	UserID int    `json:"userId"`
	Email  string `json:"email"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

// Authenticate authenticates a user and returns a JWT token
func (s *Service) Authenticate(email, password string) (*LoginResponse, error) {
	var user User
	err := s.db.QueryRow(`
		SELECT id, email, password_hash, name, role, created_at, updated_at, last_login, is_active
		FROM users
		WHERE email = $1 AND is_active = true
	`, email).Scan(
		&user.ID,
		&user.Email,
		&user.PasswordHash,
		&user.Name,
		&user.Role,
		&user.CreatedAt,
		&user.UpdatedAt,
		&user.LastLogin,
		&user.IsActive,
	)

	if err == sql.ErrNoRows {
		return nil, ErrInvalidCredentials
	}
	if err != nil {
		return nil, fmt.Errorf("database error: %w", err)
	}

	// Verify password
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return nil, ErrInvalidCredentials
	}

	// Update last login
	_, err = s.db.Exec("UPDATE users SET last_login = $1 WHERE id = $2", time.Now(), user.ID)
	if err != nil {
		// Log error but don't fail authentication
		fmt.Printf("Warning: failed to update last login: %v\n", err)
	}

	// Generate JWT token
	token, err := s.GenerateToken(&user)
	if err != nil {
		return nil, fmt.Errorf("failed to generate token: %w", err)
	}

	return &LoginResponse{
		Token: token,
		User:  user,
	}, nil
}

// GenerateToken generates a JWT token for a user
func (s *Service) GenerateToken(user *User) (string, error) {
	claims := &Claims{
		UserID: user.ID,
		Email:  user.Email,
		Role:   user.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(s.jwtSecret)
}

// VerifyToken verifies a JWT token and returns the claims
func (s *Service) VerifyToken(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return s.jwtSecret, nil
	})

	if err != nil {
		return nil, ErrInvalidToken
	}

	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		return claims, nil
	}

	return nil, ErrInvalidToken
}

// GetUserByID retrieves a user by ID
func (s *Service) GetUserByID(id int) (*User, error) {
	var user User
	err := s.db.QueryRow(`
		SELECT id, email, password_hash, name, role, created_at, updated_at, last_login, is_active
		FROM users
		WHERE id = $1
	`, id).Scan(
		&user.ID,
		&user.Email,
		&user.PasswordHash,
		&user.Name,
		&user.Role,
		&user.CreatedAt,
		&user.UpdatedAt,
		&user.LastLogin,
		&user.IsActive,
	)

	if err == sql.ErrNoRows {
		return nil, ErrUserNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("database error: %w", err)
	}

	return &user, nil
}

// ListUsers retrieves all users (admin only)
func (s *Service) ListUsers() ([]User, error) {
	rows, err := s.db.Query(`
		SELECT id, email, name, role, created_at, updated_at, last_login, is_active
		FROM users
		ORDER BY created_at DESC
	`)
	if err != nil {
		return nil, fmt.Errorf("database error: %w", err)
	}
	defer rows.Close()

	var users []User
	for rows.Next() {
		var user User
		err := rows.Scan(
			&user.ID,
			&user.Email,
			&user.Name,
			&user.Role,
			&user.CreatedAt,
			&user.UpdatedAt,
			&user.LastLogin,
			&user.IsActive,
		)
		if err != nil {
			return nil, fmt.Errorf("scan error: %w", err)
		}
		users = append(users, user)
	}

	return users, nil
}

// CreateUser creates a new user (admin only)
func (s *Service) CreateUser(req *CreateUserRequest) (*User, error) {
	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	// Set default role if not provided
	role := req.Role
	if role == "" {
		role = "user"
	}

	var user User
	err = s.db.QueryRow(`
		INSERT INTO users (email, password_hash, name, role, is_active)
		VALUES ($1, $2, $3, $4, true)
		RETURNING id, email, name, role, created_at, updated_at, last_login, is_active
	`, req.Email, hashedPassword, req.Name, role).Scan(
		&user.ID,
		&user.Email,
		&user.Name,
		&user.Role,
		&user.CreatedAt,
		&user.UpdatedAt,
		&user.LastLogin,
		&user.IsActive,
	)

	if err != nil {
		if err.Error() == `pq: duplicate key value violates unique constraint "users_email_key"` {
			return nil, ErrUserExists
		}
		return nil, fmt.Errorf("database error: %w", err)
	}

	return &user, nil
}

// UpdateUser updates a user (admin only)
func (s *Service) UpdateUser(id int, req *UpdateUserRequest) (*User, error) {
	// Build dynamic update query
	query := "UPDATE users SET updated_at = CURRENT_TIMESTAMP"
	args := []interface{}{}
	argCount := 1

	if req.Email != nil {
		query += fmt.Sprintf(", email = $%d", argCount)
		args = append(args, *req.Email)
		argCount++
	}
	if req.Name != nil {
		query += fmt.Sprintf(", name = $%d", argCount)
		args = append(args, *req.Name)
		argCount++
	}
	if req.Role != nil {
		query += fmt.Sprintf(", role = $%d", argCount)
		args = append(args, *req.Role)
		argCount++
	}
	if req.IsActive != nil {
		query += fmt.Sprintf(", is_active = $%d", argCount)
		args = append(args, *req.IsActive)
		argCount++
	}
	if req.Password != nil {
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(*req.Password), bcrypt.DefaultCost)
		if err != nil {
			return nil, fmt.Errorf("failed to hash password: %w", err)
		}
		query += fmt.Sprintf(", password_hash = $%d", argCount)
		args = append(args, hashedPassword)
		argCount++
	}

	query += fmt.Sprintf(" WHERE id = $%d RETURNING id, email, name, role, created_at, updated_at, last_login, is_active", argCount)
	args = append(args, id)

	var user User
	err := s.db.QueryRow(query, args...).Scan(
		&user.ID,
		&user.Email,
		&user.Name,
		&user.Role,
		&user.CreatedAt,
		&user.UpdatedAt,
		&user.LastLogin,
		&user.IsActive,
	)

	if err == sql.ErrNoRows {
		return nil, ErrUserNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("database error: %w", err)
	}

	return &user, nil
}

// DeleteUser deletes a user (admin only)
func (s *Service) DeleteUser(id int) error {
	result, err := s.db.Exec("DELETE FROM users WHERE id = $1", id)
	if err != nil {
		return fmt.Errorf("database error: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("error checking rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return ErrUserNotFound
	}

	return nil
}

// GetUserByEmail retrieves a user by email
func (s *Service) GetUserByEmail(email string) (*User, error) {
	var user User
	err := s.db.QueryRow(`
		SELECT id, email, password_hash, name, role, created_at, updated_at, last_login, is_active
		FROM users
		WHERE email = $1
	`, email).Scan(
		&user.ID,
		&user.Email,
		&user.PasswordHash,
		&user.Name,
		&user.Role,
		&user.CreatedAt,
		&user.UpdatedAt,
		&user.LastLogin,
		&user.IsActive,
	)

	if err == sql.ErrNoRows {
		return nil, ErrUserNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("database error: %w", err)
	}

	return &user, nil
}

// CreateOAuthUser creates a new user from OAuth provider
func (s *Service) CreateOAuthUser(req *CreateUserRequest, provider, providerID string) (*User, error) {
	// For OAuth users, we don't store a password hash
	// Instead we store the provider and provider ID

	role := req.Role
	if role == "" {
		role = "product_owner"
	}

	var user User
	err := s.db.QueryRow(`
		INSERT INTO users (email, password_hash, name, role, is_active)
		VALUES ($1, '', $2, $3, true)
		RETURNING id, email, name, role, created_at, updated_at, last_login, is_active
	`, req.Email, req.Name, role).Scan(
		&user.ID,
		&user.Email,
		&user.Name,
		&user.Role,
		&user.CreatedAt,
		&user.UpdatedAt,
		&user.LastLogin,
		&user.IsActive,
	)

	if err != nil {
		if err.Error() == `pq: duplicate key value violates unique constraint "users_email_key"` {
			return nil, ErrUserExists
		}
		return nil, fmt.Errorf("database error: %w", err)
	}

	return &user, nil
}

// UpdateLastLogin updates the last login timestamp for a user
func (s *Service) UpdateLastLogin(userID int) error {
	_, err := s.db.Exec("UPDATE users SET last_login = $1 WHERE id = $2", time.Now(), userID)
	if err != nil {
		return fmt.Errorf("failed to update last login: %w", err)
	}
	return nil
}

// GenerateTokenFromCredentials generates a JWT token from user credentials
func (s *Service) GenerateTokenFromCredentials(userID int, email, role string) (string, error) {
	user := &User{
		ID:    userID,
		Email: email,
		Role:  role,
	}
	return s.GenerateToken(user)
}
