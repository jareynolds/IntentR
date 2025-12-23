# Storyboard Markdown Export Feature

## Overview
The Storyboard page now includes a markdown export feature that generates detailed specification documents from your story cards and saves them to the `specifications/` folder.

## What Was Added

### 1. Specification API Server (`web-ui/server.js`)
- Express.js server running on port **3001**
- POST `/api/save-specification` endpoint to save markdown files
- GET `/api/health` health check endpoint
- Automatically creates `specifications/` folder if needed
- Saves files to `../specifications/` (relative to web-ui folder)

### 2. Export Functionality (`src/pages/Storyboard.tsx`)
- **"📄 Export to Markdown"** button in the Storyboard header
- `handleExportToMarkdown()` function that generates comprehensive markdown
- Fallback: Downloads file to browser if API server is not running

### 3. Updated Scripts

#### `start.sh` - Now starts the API server automatically
```bash
./start.sh
```
Starts in order:
1. Backend Docker services (integration, design, capability)
2. **Specification API Server** (port 3001)
3. Web UI (port 5173)

#### `stop.sh` - Now stops the API server
```bash
./stop.sh
```
Stops:
1. **Specification API Server**
2. Web UI
3. Backend Docker services
4. Cleans up log files and PID files

### 4. Package Updates (`web-ui/package.json`)
Added dependencies:
- `express`: ^4.18.2
- `cors`: ^2.8.5

Added script:
- `npm run server`: Manually start the API server

## How to Use

### Method 1: Using start.sh (Recommended)
```bash
# Start all services including the API server
./start.sh

# The script will show:
# ✅ IntentR is running!
#
# 📍 Service URLs:
#    - Web UI:              http://localhost:5173
#    - Specification API:   http://localhost:3001/api/health
#    - Integration Service: http://localhost:8080/health
#    - Design Service:      http://localhost:8081/health
#    - Capability Service:  http://localhost:8082/health
```

### Method 2: Manual Start
```bash
# Terminal 1: Start API server
cd web-ui
npm run server

# Terminal 2: Start dev server
cd web-ui
npm run dev
```

### Using the Export Feature

1. Navigate to **Storyboard Canvas** page
2. Create story cards with:
   - Title
   - Description
   - Status (Pending/In Progress/Completed)
   - Optional 80x80px image
3. Connect cards by clicking "Connect" button
4. Click **"📄 Export to Markdown"** button
5. File will be saved to: `specifications/storyboard-{workspace-name}-{date}.md`

## Generated Markdown Format

The exported markdown includes:

### Metadata
- Generated timestamp
- Workspace name
- Total cards and connections count

### Overview
- Summary of the storyboard

### Flow Diagram
- Mermaid flowchart showing all cards and connections
- Status emojis: ✓ (completed), ⟳ (in-progress), ○ (pending)

### Story Cards Section
For each card:
- Title with number
- Status
- Description
- Visual reference indicator
- **Flows to**: List of destination cards
- **Comes from**: List of source cards

### Technical Specifications
- Total user interaction points
- Flow complexity (connection count)
- Completion status statistics

## Example Generated File

```markdown
# Storyboard: My Workspace

## Metadata
- **Generated**: 11/14/2025, 7:15:23 PM
- **Workspace**: My Workspace
- **Total Cards**: 3
- **Connections**: 2

## Overview
This storyboard contains 3 story cards describing the user flow and interactions.

## Flow Diagram

\`\`\`mermaid
flowchart TD
    card1["✓ User Login"]
    card2["⟳ Dashboard"]
    card3["○ Data Processing"]
    card1 --> card2
    card2 --> card3
\`\`\`

## Story Cards

### 1. User Login

**Status**: Completed

**Description**:
User authentication flow

**Flows to**:
- Dashboard

---

### 2. Dashboard
...
```

## Service Ports

- **Web UI**: 5173
- **Specification API**: 3001
- **Integration Service**: 8080
- **Design Service**: 8081
- **Capability Service**: 8082

## Log Files

When running with `./start.sh`:
- `web-ui.log` - Web UI logs
- `api-server.log` - Specification API logs

View logs:
```bash
tail -f web-ui.log
tail -f api-server.log
```

## Troubleshooting

### Export fails with "API not available"
**Solution**: Make sure the API server is running
```bash
# Check if running
curl http://localhost:3001/api/health

# If not, start it
cd web-ui && npm run server
```

### Files downloading to browser instead of specifications/
**Cause**: API server not running or not accessible
**Solution**: The feature has a fallback - downloaded files can be manually moved to `specifications/` folder

## Clean Shutdown

```bash
./stop.sh
```

This will:
- Stop the Specification API server
- Stop the Web UI
- Stop all Docker backend services
- Clean up PID and log files
