// IntentR — Copyright © 2025 James Reynolds
//
// This file is part of IntentR.
// You may use this file under either:
//   • The AGPLv3 Open Source License, OR
//   • The IntentR Commercial License
// See the LICENSE.AGPL and LICENSE.COMMERCIAL files for details.

package client

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/jareynolds/ubecode/pkg/models"
)

func TestNewFigmaClient(t *testing.T) {
	client := NewFigmaClient("test-token")

	if client == nil {
		t.Fatal("expected client to be non-nil")
	}

	if client.token != "test-token" {
		t.Errorf("expected token to be 'test-token', got '%s'", client.token)
	}

	if client.baseURL != baseURL {
		t.Errorf("expected baseURL to be '%s', got '%s'", baseURL, client.baseURL)
	}
}

func TestGetFile_Success(t *testing.T) {
	// Create a mock server
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Verify request
		if r.Method != "GET" {
			t.Errorf("expected GET request, got %s", r.Method)
		}

		token := r.Header.Get("X-Figma-Token")
		if token != "test-token" {
			t.Errorf("expected token 'test-token', got '%s'", token)
		}

		// Send mock response
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{
			"key": "test-key",
			"name": "Test File",
			"lastModified": "2025-01-01T00:00:00Z"
		}`))
	}))
	defer server.Close()

	// Create client with test server URL
	client := NewFigmaClient("test-token")
	client.baseURL = server.URL

	// Test GetFile
	file, err := client.GetFile(context.Background(), "test-key")

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if file == nil {
		t.Fatal("expected file to be non-nil")
	}

	if file.Key != "test-key" {
		t.Errorf("expected key 'test-key', got '%s'", file.Key)
	}

	if file.Name != "Test File" {
		t.Errorf("expected name 'Test File', got '%s'", file.Name)
	}
}

func TestGetFile_Error(t *testing.T) {
	// Create a mock server that returns an error
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
		w.Write([]byte(`{"error": "unauthorized"}`))
	}))
	defer server.Close()

	client := NewFigmaClient("invalid-token")
	client.baseURL = server.URL

	_, err := client.GetFile(context.Background(), "test-key")

	if err == nil {
		t.Fatal("expected error, got nil")
	}
}

func TestGetComments_Success(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{
			"comments": [
				{
					"id": "1",
					"message": "Test comment",
					"user_id": "user1"
				}
			]
		}`))
	}))
	defer server.Close()

	client := NewFigmaClient("test-token")
	client.baseURL = server.URL

	comments, err := client.GetComments(context.Background(), "test-key")

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(comments) != 1 {
		t.Errorf("expected 1 comment, got %d", len(comments))
	}

	if comments[0].ID != "1" {
		t.Errorf("expected comment ID '1', got '%s'", comments[0].ID)
	}

	if comments[0].Message != "Test comment" {
		t.Errorf("expected message 'Test comment', got '%s'", comments[0].Message)
	}
}

func TestFigmaModels(t *testing.T) {
	// Test File model
	file := &models.File{
		Key:  "test-key",
		Name: "Test File",
	}

	if file.Key != "test-key" {
		t.Errorf("expected key 'test-key', got '%s'", file.Key)
	}

	// Test Comment model
	comment := &models.Comment{
		ID:      "1",
		Message: "Test comment",
	}

	if comment.ID != "1" {
		t.Errorf("expected ID '1', got '%s'", comment.ID)
	}
}
