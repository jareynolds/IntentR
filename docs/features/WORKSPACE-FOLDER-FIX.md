# Workspace Folder Creation Fix

## Issue

**Error:** "Failed to create folder" when trying to create a workspace in the workspace selector page.

## Root Cause

The application's integration service port was changed from `8080` to `9080` during the port configuration update, but 15 frontend files still contained hardcoded references to `localhost:8080`, causing API calls to fail.

## Solution Applied

### 1. Automatic Port Fix Script Created

**File:** `scripts/fix-hardcoded-ports.sh`

This script:
- Scans all frontend TypeScript/TSX files for hardcoded port references
- Creates automatic backups before making changes
- Updates all `localhost:8080` to `localhost:9080`
- Provides rollback capability

### 2. Files Updated (15 total)

| File | Purpose | Affected Endpoints |
|------|---------|-------------------|
| **FolderBrowser.tsx** | ⭐ Workspace folder creation | `/folders/create`, `/folders/list` |
| AssetsPane.tsx | Asset file fetching | `/fetch-file-meta` |
| WorkspaceIntegrations.tsx | Figma integration | `/fetch-resources`, `/suggest-resources` |
| client.ts | API client base URL | Default integration URL |
| Analyze.tsx | Application analysis | `/analysis-files`, `/analyze-application` |
| Code.tsx | Code generation | `/code-files`, `/generate-code` |
| Capabilities.tsx | Capability management | `/save-capability`, `/analyze-capabilities` |
| System.tsx | System diagram | `/save-specifications`, `/specifications/list` |
| DesignsOld.tsx | Legacy designs | Various design endpoints |
| UIDesigner.tsx | UI designer | Design export endpoints |
| AIChat.tsx | AI chat | Chat endpoints |
| Run.tsx | Run commands | Command execution |
| Storyboard.tsx | Storyboard | Story management |
| AIPrinciples.tsx | AI configuration | Preset activation |
| Designs.tsx | Design management | Design fetching |
| Integrations.tsx | External tools | Integration endpoints |

### 3. Integration Service Endpoints

The integration service (running on port **9080**) provides these folder operations:

```go
// List folders and files
GET /folders/list?path=workspaces

// Create new workspace folder
POST /folders/create
{
  "path": "workspaces",
  "name": "my-project"
}
```

**What it creates:**
- Main folder: `workspaces/my-project/`
- Specifications subfolder: `workspaces/my-project/specifications/`

## Applying the Fix

### If Not Already Applied

```bash
# Run the fix script
./scripts/fix-hardcoded-ports.sh

# Restart the application
./stop.sh
./start.sh
```

### If Already Applied

The fix has been automatically applied. You just need to restart:

```bash
./stop.sh
./start.sh
```

## Verification

After restarting, test workspace creation:

1. Open the application: `http://localhost:6173`
2. Go to workspace selector
3. Click "Create New Folder" or browse folders
4. Enter folder name
5. Click create
6. ✅ Folder should be created successfully

**Expected behavior:**
- Folder browser loads without errors
- Folder creation succeeds
- New workspace appears in workspace list

**API call should be:**
```
POST http://localhost:9080/folders/create
{
  "path": "workspaces",
  "name": "my-new-workspace"
}
```

## Backup Information

All changes are automatically backed up to:
```
.port-fix-backup-YYYYMMDD-HHMMSS/src/
```

To restore original files:
```bash
# Find your backup
ls -la .port-fix-backup-*/

# Restore from backup
cp -r .port-fix-backup-20251125-092035/src/* web-ui/src/
```

## Prevention for Future Port Changes

When changing ports in the future:

1. **Run the port configuration script:**
   ```bash
   ./scripts/change-ports.sh
   ```

2. **Run the hardcoded port fix script:**
   ```bash
   ./scripts/fix-hardcoded-ports.sh
   ```

3. **Restart services:**
   ```bash
   ./stop.sh && ./start.sh
   ```

The `change-ports.sh` script now includes a reminder to run `fix-hardcoded-ports.sh`.

## Technical Details

### Why Hardcoded Ports Were Missed

The initial port configuration script (`change-ports.sh`) focused on:
- Configuration files (`.env`, `docker-compose.yml`)
- Server files (Node.js servers)
- Context files (React contexts)
- A few key pages

It **missed** many component files and pages that had direct API calls.

### Solution Architecture

```
┌─────────────────────────────────────────┐
│    Frontend (React) - Port 6173        │
│                                         │
│  FolderBrowser.tsx                      │
│  └─> fetch('http://localhost:9080/...) │
└─────────────────┬───────────────────────┘
                  │
                  │ API Calls
                  ▼
┌─────────────────────────────────────────┐
│  Integration Service - Port 9080        │
│                                         │
│  POST /folders/create                   │
│  GET  /folders/list                     │
│  POST /fetch-resources                  │
│  etc...                                 │
└─────────────────────────────────────────┘
```

### Files That Need Port References

**Configuration files:** Use environment variables
- `web-ui/.env` - `VITE_INTEGRATION_SERVICE_URL`
- `src/api/client.ts` - Falls back to env var

**Component files:** Direct fetch calls (fixed by script)
- All component and page files that call backend APIs

**Best practice moving forward:**
- Use the API client from `src/api/client.ts` instead of direct fetch
- API client already uses environment variables
- Avoids hardcoded ports

## Related Documentation

- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Added workspace folder creation issue
- [scripts/PORT-CONFIGURATION.md](scripts/PORT-CONFIGURATION.md) - Port configuration guide
- [STARTUP-GUIDE.md](STARTUP-GUIDE.md) - Application startup procedures

## Summary

✅ **Issue:** Workspace folder creation failing
✅ **Cause:** Port mismatch (8080 vs 9080)
✅ **Fix:** Updated 15 files with hardcoded port references
✅ **Tool:** Created `scripts/fix-hardcoded-ports.sh`
✅ **Prevention:** Updated port change script with reminder
✅ **Documentation:** Updated troubleshooting guide

**Status:** RESOLVED - Restart application to apply fix
