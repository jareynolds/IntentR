# Figma Workspace Integration Feature

## Overview

This feature enables automatic Figma project and file discovery directly from the Workspaces page. Users simply paste their Figma team URL when creating or editing a workspace, and the system automatically fetches all projects and files from that team.

## ✨ Key Features

1. **Simple Setup** - Just paste your Figma team URL in workspace settings
2. **Automatic Discovery** - Automatically fetches all projects from your Figma team
3. **File Selection** - Browse and select specific files from each project
4. **Persistent Storage** - Selected files are saved per workspace
5. **No Complex Configuration** - No need for separate integration management

## 🎯 User Workflow

### Step 1: Configure Figma Integration (One-Time Setup)

1. Go to **Integrations** page
2. Click **Configure** on Figma API
3. Enter your Figma Personal Access Token
   - Get it from: https://www.figma.com/developers/api
   - Settings → Account → Personal Access Tokens → Generate new token
4. Click **Save Configuration**

### Step 2: Add Figma Team URL to Workspace

1. Go to **Workspaces** page
2. Either create a new workspace or edit an existing one
3. In the "Figma Team URL" field, paste your team URL
   - Example: `https://www.figma.com/files/team/1234567890/My-Team-Name`
   - Find it by going to Figma → Files → Your Team, then copy the browser URL
4. Save the workspace

### Step 3: Select Figma Files in Designs Page

1. Go to **Designs** page
2. You'll automatically see all projects from your Figma team
3. Click **Select Files** on any project
4. A modal will open showing all files in that project with:
   - File names
   - Thumbnails
   - Last updated dates
   - Direct links to Figma
5. Check the files you want to use in this workspace
6. Click **Save X Files**

### Step 4: View Selected Files

1. Selected files appear in the "Selected Files" section at the top of Designs page
2. Each file shows:
   - Thumbnail
   - File name
   - Link to open in Figma
   - Remove button to unselect
3. These files are now available throughout the workspace

## 📋 Technical Implementation

### Data Model Changes

**Workspace Interface** (`web-ui/src/context/WorkspaceContext.tsx`):
```typescript
export interface Workspace {
  id: string;
  name: string;
  description?: string;
  figmaTeamUrl?: string;  // ← NEW FIELD
  // ... other fields
}
```

### Storage

**Workspace Data**:
- Stored in localStorage: `workspaces` key
- Includes `figmaTeamUrl` field

**Selected Files**:
- Stored in localStorage: `workspace_figma_files_{workspaceId}` key
- Array of FigmaFile objects

### API Endpoints Used

1. **Fetch Projects**:
   ```
   POST http://localhost:8080/fetch-resources
   Body: {
     integration_name: "Figma API",
     credentials: {
       access_token: "...",
       team_url: "https://www.figma.com/files/team/123456/..."
     }
   }
   ```

2. **Fetch Files from Project**:
   ```
   POST http://localhost:8080/fetch-files
   Body: {
     integration_name: "Figma API",
     resource_id: "project_id",
     resource_type: "project",
     credentials: {
       access_token: "..."
     }
   }
   ```

### Backend Flow

1. `fetchFigmaResources()` in `internal/integration/resources.go`:
   - Parses team ID from `team_url` using `extractFigmaTeamID()`
   - Calls `/v1/teams/{team_id}/projects` Figma API
   - Returns list of projects

2. `fetchFigmaFiles()` in `internal/integration/resources.go`:
   - Takes project ID from selected resource
   - Calls `/v1/projects/{project_id}/files` Figma API
   - Returns list of files with thumbnails and metadata

## 🔄 Complete Workflow Diagram

```
┌─────────────────────┐
│  User Creates/Edits │
│     Workspace       │
│  (adds team URL)    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Goes to Designs    │
│       Page          │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  System parses      │
│  team ID from URL   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Fetches projects   │
│  from Figma API     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  User clicks        │
│  "Select Files"     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Fetches files      │
│  from project       │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  User selects files │
│  and saves          │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Files stored in    │
│  localStorage       │
└─────────────────────┘
```

## 🎨 UI Screenshots Descriptions

### Workspaces Page
- "Figma Team URL (Optional)" field in create/edit modal
- Helper text explaining where to find the URL
- "View Figma Team" link shown on workspace cards that have a team URL

### Designs Page - No Config
- Shows message: "Figma Team URL Not Configured"
- Instructions on how to add team URL
- "Go to Workspaces" button

### Designs Page - Projects View
- Grid of project cards with Figma icon
- Each card shows:
  - Project name
  - Number of files already selected
  - "Select Files" button

### Designs Page - Files Modal
- Modal showing all files in selected project
- Checkboxes for selection
- Thumbnails for each file
- "View in Figma" links
- "Save X Files" button

### Designs Page - Selected Files
- Grid at top showing all selected files across all projects
- Thumbnail, name, view link, and remove button for each
- Persists across page refreshes

## 🐛 Troubleshooting

### "No Figma projects found"

**Possible Causes**:
- Figma access token doesn't have permission to view the team
- Team URL is incorrect
- Personal access tokens may have limited permissions (OAuth might be required)

**Solutions**:
- Verify the team URL is copied correctly from Figma
- Check that your Figma token has access to the team
- Try generating a new access token

### "Failed to fetch files"

**Possible Causes**:
- Project is empty
- Token permissions insufficient
- API rate limiting

**Solutions**:
- Verify the project has files in Figma
- Wait a moment and try refreshing
- Check integration service logs: `tail -f integration-service.log`

### "Figma Not Configured"

**Solution**:
- Go to Integrations page
- Configure Figma API with your access token
- Return to Designs page

## 🔐 Security Notes

- Figma access tokens are stored in localStorage
- Team URLs are stored with workspace data
- No tokens are sent to the frontend (stored in localStorage only)
- All Figma API calls go through the integration service backend

## 📝 Files Modified

1. **Frontend**:
   - `web-ui/src/context/WorkspaceContext.tsx` - Added `figmaTeamUrl` field
   - `web-ui/src/pages/Workspaces.tsx` - Added team URL input fields
   - `web-ui/src/pages/Designs.tsx` - Complete rewrite for new workflow

2. **Backend**:
   - `internal/integration/resources.go` - Team ID parsing and API integration
   - `internal/integration/analyzer.go` - Added team_url to Figma config fields
   - `internal/integration/resources_test.go` - Unit tests for URL parsing

3. **Documentation**:
   - `FIGMA_WORKSPACE_INTEGRATION.md` - This file
   - `FIGMA_INTEGRATION_TESTING.md` - Testing guide

## 🚀 Future Enhancements

- [ ] Real-time sync with Figma (webhooks)
- [ ] File versioning support
- [ ] Bulk file selection (select all in project)
- [ ] Search/filter files by name
- [ ] Preview files directly in the app
- [ ] Support for file comments and annotations
- [ ] Multi-team support per workspace

## ✅ Testing Checklist

- [ ] Create new workspace with Figma team URL
- [ ] Edit existing workspace to add team URL
- [ ] View projects list in Designs page
- [ ] Select files from a project
- [ ] Save selected files
- [ ] Verify files persist after page refresh
- [ ] Remove a selected file
- [ ] Test with workspace without team URL (should show helper message)
- [ ] Test with Figma not configured (should show config prompt)
- [ ] Test with multiple projects
- [ ] Test with empty project (no files)

## 📞 Support

If you encounter issues:
1. Check browser console for errors (F12)
2. Check integration service logs: `tail -f integration-service.log`
3. Verify Figma token is valid
4. Ensure team URL format is correct

## 🎉 Success Criteria

You've successfully implemented this feature when:
1. ✅ User can add Figma team URL to workspace
2. ✅ Designs page shows all projects from the team
3. ✅ User can browse and select files from projects
4. ✅ Selected files are saved and persist
5. ✅ Files are accessible throughout the workspace
