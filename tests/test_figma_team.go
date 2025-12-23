// Intentr — Copyright © 2025 James Reynolds
//
// This file is part of Intentr.
// You may use this file under either:
//   • The AGPLv3 Open Source License, OR
//   • The Intentr Commercial License
// See the LICENSE.AGPL and LICENSE.COMMERCIAL files for details.

//go:build ignore

package main

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"os"
	"strings"

	"github.com/jareynolds/intentr/internal/integration"
)

func main() {
	fmt.Println("=== Figma Team URL Parser & API Tester ===\n")

	// Get Figma token
	var accessToken string
	if token := os.Getenv("FIGMA_TOKEN"); token != "" {
		accessToken = token
		fmt.Println("✓ Using FIGMA_TOKEN from environment")
	} else {
		fmt.Print("Enter your Figma Personal Access Token: ")
		reader := bufio.NewReader(os.Stdin)
		token, _ := reader.ReadString('\n')
		accessToken = strings.TrimSpace(token)
	}

	if accessToken == "" {
		fmt.Println("❌ Error: Figma token is required")
		fmt.Println("\nGet your token from: https://www.figma.com/developers/api#access-tokens")
		return
	}

	// Get team URL
	var teamURL string
	if url := os.Getenv("FIGMA_TEAM_URL"); url != "" {
		teamURL = url
		fmt.Printf("✓ Using FIGMA_TEAM_URL from environment: %s\n", url)
	} else {
		fmt.Print("\nEnter your Figma Team URL (e.g., https://www.figma.com/files/team/1234567890/Team-Name): ")
		reader := bufio.NewReader(os.Stdin)
		url, _ := reader.ReadString('\n')
		teamURL = strings.TrimSpace(url)
	}

	if teamURL == "" {
		fmt.Println("❌ Error: Team URL is required")
		fmt.Println("\nTo find your team URL:")
		fmt.Println("1. Go to Figma and open your team's files page")
		fmt.Println("2. Copy the URL from your browser")
		fmt.Println("3. It should look like: https://www.figma.com/files/team/1234567890/Team-Name")
		return
	}

	fmt.Println("\n" + strings.Repeat("=", 60))
	fmt.Println("Testing Figma Integration")
	fmt.Println(strings.Repeat("=", 60))

	// Create request
	req := integration.FetchResourcesRequest{
		IntegrationName: "Figma API",
		Credentials: map[string]string{
			"access_token": accessToken,
			"team_url":     teamURL,
		},
	}

	fmt.Printf("\n📍 Team URL: %s\n", teamURL)
	fmt.Println("\n⏳ Parsing team ID and fetching projects from Figma API...")

	// Fetch resources
	ctx := context.Background()
	resp, err := integration.FetchResources(ctx, req)
	if err != nil {
		fmt.Printf("\n❌ Error: %v\n\n", err)
		fmt.Println("Common issues:")
		fmt.Println("  - Invalid or expired access token")
		fmt.Println("  - Token doesn't have access to this team")
		fmt.Println("  - Team URL format is incorrect")
		fmt.Println("  - Personal access tokens may not work (OAuth required)")
		return
	}

	// Pretty print response
	fmt.Println("\n" + strings.Repeat("=", 60))
	fmt.Println("✅ SUCCESS!")
	fmt.Println(strings.Repeat("=", 60))

	jsonData, _ := json.MarshalIndent(resp, "", "  ")
	fmt.Printf("\n📄 Full API Response:\n%s\n", string(jsonData))

	fmt.Println("\n" + strings.Repeat("-", 60))
	fmt.Printf("📊 Summary: Found %d project(s)\n", len(resp.Resources))
	fmt.Println(strings.Repeat("-", 60))

	if len(resp.Resources) == 0 {
		fmt.Println("\n⚠️  No projects found. This could mean:")
		fmt.Println("  - The team has no projects")
		fmt.Println("  - Your token doesn't have access to view projects")
		fmt.Println("  - Personal access tokens may have limited permissions")
	} else {
		for i, resource := range resp.Resources {
			fmt.Printf("\n%d. Name: %s\n", i+1, resource.Name)
			fmt.Printf("   ID: %s\n", resource.ID)
			fmt.Printf("   Type: %s\n", resource.Type)
			if resource.Description != "" {
				fmt.Printf("   Description: %s\n", resource.Description)
			}
		}
	}

	// Show metadata
	if resp.Metadata != nil {
		fmt.Println("\n" + strings.Repeat("-", 60))
		fmt.Println("📌 Metadata:")
		fmt.Println(strings.Repeat("-", 60))
		for key, value := range resp.Metadata {
			fmt.Printf("  %s: %v\n", key, value)
		}
	}

	fmt.Println("\n" + strings.Repeat("=", 60))
	fmt.Println("Test completed!")
	fmt.Println(strings.Repeat("=", 60) + "\n")
}
