# Figma Integration - Team Projects Listing

## ✅ Implementation Complete

I've successfully implemented **automatic Figma team ID parsing and projects listing** for the Designs page.

### What Was Implemented

1. **Backend Changes:**
   - `extractFigmaTeamID()` - Parses team ID from Figma URLs (e.g., `https://www.figma.com/files/team/123456/Team-Name`)
   - `fetchFigmaResources()` - Fetches projects from Figma API using parsed team ID
   - `fetchFigmaFiles()` - Fetches files from a selected Figma project
   - Added `team_url` as a required field in Figma integration configuration

2. **Integration Service:**
   - Rebuilt with updated code
   - Now requires `team_url` in addition to `access_token` for Figma

## 🧪 How to Test End-to-End

### Step 1: Clear Figma Integration Cache (Important!)

Since you may have already configured Figma, you need to clear the cache to get the new `team_url` field:

**Option A: Clear in Browser Console**
```javascript
// Open browser console (F12 or Cmd+Option+I)
localStorage.removeItem('integration_config_figma_api');
localStorage.removeItem('integration_analysis_https://www.figma.com/developers/api');
location.reload();
```

**Option B: Reset via HTML page**
Open `web-ui/reset-figma-config.html` in your browser and click the reset button.

### Step 2: Configure Figma Integration

1. Go to **Integrations** page in the app
2. Click **Configure** on Figma API
3. You should now see **two required fields**:
   - `access_token` - Your Figma Personal Access Token
   - `team_url` - Your Figma team URL

4. Fill in the fields:
   - **access_token**: Get from https://www.figma.com/developers/api (Settings → Account → Personal Access Tokens)
   - **team_url**: Copy from your browser when viewing your team's files
     - Example: `https://www.figma.com/files/team/1234567890/My-Team-Name`
     - You can find this by going to Figma → Files → Your Team

5. Click **Save Configuration**

### Step 3: Link Figma Projects to Workspace

1. Go to **Workspaces** page
2. Find your workspace and click the **🔗 Integrations** button
3. Select **Figma API**
4. **The system will now automatically**:
   - Parse the team ID from your team_url
   - Call `/v1/teams/{team_id}/projects` API
   - Display all your Figma projects

5. Select the projects you want to link to this workspace
6. Click **Save**

### Step 4: View Files in Designs Page

1. Go to **Designs** page
2. You should see your linked Figma projects listed
3. Click **Assets/Files** on a project
4. **The system will automatically**:
   - Call `/v1/projects/{project_id}/files` API
   - Display all files in that project with:
     - File names
     - Thumbnail URLs
     - Last modified dates
     - Direct links to Figma

5. Select files to make available in the workspace
6. Click **Save**

## 🔍 What to Verify

### Expected Flow:
1. ✅ Figma configuration requires `team_url` field
2. ✅ Team ID is parsed from the URL automatically
3. ✅ Projects list appears when linking to workspace
4. ✅ Files list appears when clicking "Assets/Files" on a project
5. ✅ Selected files are saved and available in AssetsPane

### If Something Goes Wrong:

**No team_url field showing:**
- Clear localStorage (see Step 1)
- Make sure integration-service restarted after rebuild

**"Failed to fetch resources" error:**
- Check that your Figma token is valid
- Verify the team_url format is correct
- Personal access tokens may not have `projects:read` scope (known Figma API limitation)

**No projects found:**
- Your team may not have any projects
- Your access token may not have permission to view projects
- Figma API may require OAuth instead of personal access tokens

## 📋 Test Checklist

- [ ] Clear Figma integration cache
- [ ] Reconfigure Figma with access_token AND team_url
- [ ] Go to Workspaces → Integrations → Select Figma
- [ ] Verify projects list appears
- [ ] Select and save at least one project
- [ ] Go to Designs page
- [ ] Click "Assets/Files" on the saved project
- [ ] Verify files list appears with thumbnails
- [ ] Select and save files
- [ ] Verify files appear in other pages (Storyboard, etc.)

## 🐛 Debugging

If you encounter issues, check:

1. **Integration service logs:**
   ```bash
   tail -f integration-service.log
   ```

2. **Browser console** (F12) for any JavaScript errors

3. **Network tab** in browser DevTools to see API requests/responses

4. **Test the parsing directly:**
   ```bash
   go run test_figma_team.go
   # Enter your token and team URL when prompted
   ```

## 📝 Technical Details

### API Endpoints Used:
- `GET /v1/me` - Get user info (fallback if no team_url)
- `GET /v1/teams/{team_id}/projects` - List projects in team
- `GET /v1/projects/{project_id}/files` - List files in project

### URL Parsing:
The `extractFigmaTeamID()` function handles these formats:
- `https://www.figma.com/files/team/123456/Team-Name`
- `https://www.figma.com/files/team/123456`
- `https://www.figma.com/files/team/123456/Team-Name/sub-path`

All tested and passing unit tests ✅

## 🎯 Next Steps

Once this is working:
1. Files will be available in the AssetsPane component
2. You can reference Figma designs in Storyboard
3. Design-to-development workflow is complete!

Let me know what happens when you test this!
