// IntentR — Copyright © 2025 James Reynolds
//
// This file is part of IntentR.
// You may use this file under either:
//   • The AGPLv3 Open Source License, OR
//   • The IntentR Commercial License
// See the LICENSE.AGPL and LICENSE.COMMERCIAL files for details.

package auth

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

// OAuthConfig holds OAuth configuration
type OAuthConfig struct {
	GoogleConfig *oauth2.Config
	StateStore   map[string]time.Time // In production, use Redis or similar
}

// GoogleUserInfo represents the user info from Google
type GoogleUserInfo struct {
	ID            string `json:"id"`
	Email         string `json:"email"`
	VerifiedEmail bool   `json:"verified_email"`
	Name          string `json:"name"`
	GivenName     string `json:"given_name"`
	FamilyName    string `json:"family_name"`
	Picture       string `json:"picture"`
}

// NewOAuthConfig creates a new OAuth configuration
func NewOAuthConfig(clientID, clientSecret, redirectURL string) *OAuthConfig {
	return &OAuthConfig{
		GoogleConfig: &oauth2.Config{
			ClientID:     clientID,
			ClientSecret: clientSecret,
			RedirectURL:  redirectURL,
			Scopes: []string{
				"https://www.googleapis.com/auth/userinfo.email",
				"https://www.googleapis.com/auth/userinfo.profile",
			},
			Endpoint: google.Endpoint,
		},
		StateStore: make(map[string]time.Time),
	}
}

// GenerateStateToken generates a random state token for OAuth
func (oc *OAuthConfig) GenerateStateToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	state := base64.URLEncoding.EncodeToString(b)

	// Store state with expiration (5 minutes)
	oc.StateStore[state] = time.Now().Add(5 * time.Minute)

	// Clean up expired states
	go oc.cleanupExpiredStates()

	return state, nil
}

// ValidateState validates the OAuth state token
func (oc *OAuthConfig) ValidateState(state string) bool {
	expiration, exists := oc.StateStore[state]
	if !exists {
		return false
	}

	if time.Now().After(expiration) {
		delete(oc.StateStore, state)
		return false
	}

	delete(oc.StateStore, state)
	return true
}

// cleanupExpiredStates removes expired state tokens
func (oc *OAuthConfig) cleanupExpiredStates() {
	now := time.Now()
	for state, expiration := range oc.StateStore {
		if now.After(expiration) {
			delete(oc.StateStore, state)
		}
	}
}

// GetGoogleUserInfo retrieves user information from Google
func (oc *OAuthConfig) GetGoogleUserInfo(ctx context.Context, code string) (*GoogleUserInfo, error) {
	// Exchange code for token
	token, err := oc.GoogleConfig.Exchange(ctx, code)
	if err != nil {
		return nil, fmt.Errorf("code exchange failed: %w", err)
	}

	// Get user info from Google
	response, err := http.Get("https://www.googleapis.com/oauth2/v2/userinfo?access_token=" + token.AccessToken)
	if err != nil {
		return nil, fmt.Errorf("failed getting user info: %w", err)
	}
	defer response.Body.Close()

	if response.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(response.Body)
		return nil, fmt.Errorf("failed getting user info: status %d, body: %s", response.StatusCode, string(body))
	}

	var userInfo GoogleUserInfo
	if err := json.NewDecoder(response.Body).Decode(&userInfo); err != nil {
		return nil, fmt.Errorf("failed reading user info: %w", err)
	}

	return &userInfo, nil
}
