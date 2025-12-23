# IntentR Startup Guide

## Quick Start Options

IntentR offers two ways to start the application depending on your needs:

### Option 1: Development Mode (Recommended for Frontend Development)

**Use when:**
- You're working on frontend features (Ideation, Storyboard, UI)
- You don't have Docker installed or running
- You don't need backend microservices

**Command:**
```bash
./start-dev.sh
```

**What it starts:**
- ✅ Web UI (port 5173)
- ✅ Specification API Server (port 3001)
- ✅ Collaboration Server (port 8084)

**What it skips:**
- ❌ Docker services (Integration, Design, Capability)

### Option 2: Full Stack Mode (Requires Docker)

**Use when:**
- You need all backend microservices
- You're testing full integrations
- You have Docker Desktop running

**Command:**
```bash
./start.sh
```

**What it starts:**
- ✅ Web UI (port 5173)
- ✅ Specification API Server (port 3001)
- ✅ Collaboration Server (port 8084)
- ✅ Auth Service (port 8083) - Docker
- ✅ Integration Service (port 8080) - Docker
- ✅ Design Service (port 8081) - Docker
- ✅ Capability Service (port 8082) - Docker

## Troubleshooting

### Issue: "Docker is not running"

**Solution 1: Use Development Mode**
```bash
./start-dev.sh
```

**Solution 2: Start Docker**
1. Open Docker Desktop
2. Wait for Docker to start
3. Run `./start.sh` again

### Issue: "Ports already in use"

**Solution: Stop existing services**
```bash
./stop.sh
```

Then try starting again.

### Issue: "npm install" fails

**Solution: Clear and reinstall**
```bash
cd web-ui
rm -rf node_modules package-lock.json
npm install
cd ..
./start-dev.sh
```

### Issue: Can't access http://localhost:5173

**Check logs:**
```bash
tail -f web-ui.log
```

**Common causes:**
- Port 5173 in use
- Node.js not installed
- Dependencies not installed

## Service URLs

Once started, access these URLs:

### Frontend
- **Web UI**: http://localhost:5173
- **Specification API**: http://localhost:3001/api/health
- **Collaboration API**: http://localhost:8084/api/health

### Backend (Full Stack mode only)
- **Auth Service**: http://localhost:8083/health
- **Integration Service**: http://localhost:8080/health
- **Design Service**: http://localhost:8081/health
- **Capability Service**: http://localhost:8082/health

## Default Login (Full Stack mode)

When authentication is enabled:
- **Email**: admin@intentr.local
- **Password**: admin123
- ⚠️ **Change password after first login!**

## Viewing Logs

**Web UI:**
```bash
tail -f web-ui.log
```

**API Server:**
```bash
tail -f api-server.log
```

**Collaboration Server:**
```bash
tail -f collab-server.log
```

**Docker Services:**
```bash
docker-compose logs -f
docker-compose logs -f auth-service
```

## Stopping Services

**Stop all services:**
```bash
./stop.sh
```

This stops:
- Web UI
- API servers
- Docker containers (if running)
- Cleans up log files and PID files

## Requirements

### For Development Mode (start-dev.sh)
- Node.js 18+
- npm 9+

### For Full Stack Mode (start.sh)
- Node.js 18+
- npm 9+
- Docker Desktop
- docker-compose

## First Time Setup

1. **Install dependencies:**
```bash
cd web-ui
npm install
cd ..
```

2. **Start in development mode:**
```bash
./start-dev.sh
```

3. **Open browser:**
   - Navigate to http://localhost:5173
   - Start using Ideation and Storyboard!

## What Can I Do Without Docker?

### ✅ Full Functionality Available:
- Ideation Canvas
  - Create text and image blocks
  - Tag items
  - Quick templates
  - Freeform organization
- Storyboard Planning
  - Create story cards
  - Draw connections
  - Link to ideation tags
  - Export to markdown
- Workspace Management
  - Create/switch workspaces
  - Persistent storage
- Real-time Collaboration
  - See other users' cursors
  - Sync grid updates
  - Live collaboration

### ❌ Not Available Without Docker:
- Backend microservices
- External system integrations
- Advanced authentication (uses localStorage auth instead)

## Environment Variables

### web-ui/.env
Create this file or copy from `.env.example`:
```
VITE_API_URL=http://localhost:3001
VITE_COLLAB_URL=http://localhost:8084
VITE_AUTH_URL=http://localhost:8083
```

### Root .env
Only needed for full stack mode with Docker:
```
FIGMA_TOKEN=your_figma_personal_access_token
```

## Performance Tips

1. **Use development mode** for faster startup
2. **Close unused tabs** to save memory
3. **Check logs** if things seem slow
4. **Restart services** if experiencing issues:
   ```bash
   ./stop.sh
   ./start-dev.sh
   ```

## Getting Help

### Check Status
```bash
# Check if services are running
ps aux | grep node
ps aux | grep npm

# Check ports
lsof -i :5173  # Web UI
lsof -i :3001  # API Server
lsof -i :8084  # Collaboration
```

### Kill Stuck Processes
```bash
pkill -f "npm run dev"
pkill -f "npm run server"
pkill -f "vite"
```

### Full Reset
```bash
./stop.sh
cd web-ui
rm -rf node_modules
npm install
cd ..
./start-dev.sh
```

## Development Workflow

**Typical workflow:**

1. **Start services:**
   ```bash
   ./start-dev.sh
   ```

2. **Open browser:**
   - http://localhost:5173

3. **Make code changes:**
   - Files in `web-ui/src/*`
   - Hot reload automatic

4. **View changes:**
   - Browser updates automatically
   - Check console for errors

5. **When done:**
   ```bash
   ./stop.sh
   ```

## Summary

- 🚀 **Quick start**: `./start-dev.sh`
- 🛑 **Stop**: `./stop.sh`
- 📝 **View logs**: `tail -f web-ui.log`
- 🌐 **Access**: http://localhost:5173

For most development work, `./start-dev.sh` is all you need!
