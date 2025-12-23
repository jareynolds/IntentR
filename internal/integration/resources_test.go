// IntentR — Copyright © 2025 James Reynolds
//
// This file is part of IntentR.
// You may use this file under either:
//   • The AGPLv3 Open Source License, OR
//   • The IntentR Commercial License
// See the LICENSE.AGPL and LICENSE.COMMERCIAL files for details.

package integration

import (
	"testing"
)

func TestExtractFigmaTeamID(t *testing.T) {
	tests := []struct {
		name        string
		url         string
		expectedID  string
		expectError bool
	}{
		{
			name:        "Standard team URL with name",
			url:         "https://www.figma.com/files/team/1234567890/My-Team",
			expectedID:  "1234567890",
			expectError: false,
		},
		{
			name:        "Team URL without trailing name",
			url:         "https://www.figma.com/files/team/1234567890",
			expectedID:  "1234567890",
			expectError: false,
		},
		{
			name:        "Team URL with additional path segments",
			url:         "https://www.figma.com/files/team/987654321/Another-Team/sub-path",
			expectedID:  "987654321",
			expectError: false,
		},
		{
			name:        "Team URL with trailing slash",
			url:         "https://www.figma.com/files/team/555555/",
			expectedID:  "555555",
			expectError: false,
		},
		{
			name:        "Invalid URL - no team prefix",
			url:         "https://www.figma.com/files/1234567890",
			expectedID:  "",
			expectError: true,
		},
		{
			name:        "Invalid URL - empty team ID",
			url:         "https://www.figma.com/files/team//My-Team",
			expectedID:  "",
			expectError: true,
		},
		{
			name:        "Different domain with team path",
			url:         "https://figma.com/files/team/999999999/Team-Name",
			expectedID:  "999999999",
			expectError: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			teamID, err := extractFigmaTeamID(tt.url)

			if tt.expectError {
				if err == nil {
					t.Errorf("Expected error but got none. URL: %s", tt.url)
				}
			} else {
				if err != nil {
					t.Errorf("Unexpected error: %v. URL: %s", err, tt.url)
				}
				if teamID != tt.expectedID {
					t.Errorf("Expected team ID '%s' but got '%s'. URL: %s", tt.expectedID, teamID, tt.url)
				}
			}
		})
	}
}
