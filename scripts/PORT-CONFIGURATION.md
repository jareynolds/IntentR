# IntentR Port Configuration Guide

## Overview

This document describes all ports used by the IntentR application and provides guidance for administrators who need to change ports to avoid conflicts.

## Current Default Ports

| Service | Port | Type | Description |
|---------|------|------|-------------|
| **Integration Service** | 8080 | HTTP | Go backend service for Figma integration and AI analysis |
| **Design Service** | 8081 | HTTP | Go backend service for design artifact management |
| **Capability Service** | 8082 | HTTP | Go backend service for SAFe capability tracking |
| **Auth Service** | 8083 | HTTP | Go backend service for authentication |
| **Collaboration Server** | 8084 | WebSocket | Node.js real-time collaboration server |
| **Specification API** | 3001 | HTTP | Node.js API for saving specification files |
| **Shared Workspace API** | 3002 | HTTP | Node.js API for shared workspace management |
| **Web UI (Vite Dev)** | 5173 | HTTP | Frontend development server |
| **PostgreSQL Database** | 5432 | TCP | Database server (when enabled) |

## Suggested Alternative Port Sets

### Option 1: 9000 Range (Recommended)
Best for avoiding conflicts with common development tools.

| Service | Alternative Port | Notes |
|---------|-----------------|-------|
| Integration Service | 9080 | |
| Design Service | 9081 | |
| Capability Service | 9082 | |
| Auth Service | 9083 | |
| Collaboration Server | 9084 | |
| Specification API | 4001 | |
| Shared Workspace API | 4002 | |
| Web UI (Vite Dev) | 6173 | |
| PostgreSQL Database | 6432 | |

### Option 2: 7000 Range
Alternative if 9000 range is occupied.

| Service | Alternative Port | Notes |
|---------|-----------------|-------|
| Integration Service | 7080 | |
| Design Service | 7081 | |
| Capability Service | 7082 | |
| Auth Service | 7083 | |
| Collaboration Server | 7084 | |
| Specification API | 7001 | |
| Shared Workspace API | 7002 | |
| Web UI (Vite Dev) | 7173 | |
| PostgreSQL Database | 7432 | |

### Option 3: High Port Range (Safer)
Best for maximum compatibility, uses high ports (10000+).

| Service | Alternative Port | Notes |
|---------|-----------------|-------|
| Integration Service | 10080 | |
| Design Service | 10081 | |
| Capability Service | 10082 | |
| Auth Service | 10083 | |
| Collaboration Server | 10084 | |
| Specification API | 11001 | |
| Shared Workspace API | 11002 | |
| Web UI (Vite Dev) | 11173 | |
| PostgreSQL Database | 15432 | |

## Common Port Conflicts

### Ports to Avoid

| Port | Common Usage | Reason to Avoid |
|------|--------------|-----------------|
| 3000 | Create React App, Next.js | Very common for React development |
| 4200 | Angular CLI | Default Angular development server |
| 5000 | Flask, various Python apps | Popular Python framework default |
| 8000 | Django, various dev servers | Common development port |
| 8888 | Jupyter Notebook | Data science tools |
| 3306 | MySQL | Database default port |
| 27017 | MongoDB | Database default port |
| 6379 | Redis | Cache server default |
| 9000 | PHP-FPM | Often used for PHP applications |

## Using the Port Configuration Script

### Quick Start

1. Make the script executable:
   ```bash
   chmod +x scripts/change-ports.sh
   ```

2. Run the script:
   ```bash
   ./scripts/change-ports.sh
   ```

3. Choose an option:
   - Option 1: Use suggested ports (9000 range)
   - Option 2: Enter custom ports
   - Option 3: Exit without changes

### What the Script Does

The script automatically updates the following files:

1. **Root Configuration**
   - `.env` - Environment variables for service ports
   - `docker-compose.yml` - Docker container port mappings

2. **Frontend Configuration**
   - `web-ui/.env` - Vite environment variables
   - `web-ui/vite.config.ts` - Vite dev server port
   - `web-ui/server.js` - Specification API port
   - `web-ui/collaboration-server.js` - Collaboration server port
   - `web-ui/shared-workspace-server.js` - Shared workspace API port

3. **Source Code**
   - `web-ui/src/context/WorkspaceContext.tsx` - Shared workspace API URL
   - `web-ui/src/context/CollaborationContext.tsx` - Collaboration server URL
   - `web-ui/src/pages/Ideation.tsx` - Hardcoded API URLs

4. **Backups**
   - All original files are backed up to `.port-backup-TIMESTAMP/`
   - You can restore from backups if needed

### After Running the Script

1. **Stop all running services:**
   ```bash
   docker-compose down
   cd web-ui
   # Kill any running Node.js servers (Ctrl+C or pkill node)
   ```

2. **Rebuild Docker containers:**
   ```bash
   docker-compose build
   docker-compose up -d
   ```

3. **Restart Node.js servers:**
   ```bash
   cd web-ui
   node server.js &
   node collaboration-server.js &
   node shared-workspace-server.js &
   ```

4. **Start development server:**
   ```bash
   cd web-ui
   npm run dev
   ```

## Manual Port Configuration

If you prefer to change ports manually, here's what needs to be updated:

### Backend Services (Go)

Each Go service reads its port from:
1. Environment variable `PORT`
2. `.env` file (via docker-compose)
3. Hardcoded default in `cmd/{service-name}/main.go`

### Frontend Services (Node.js)

1. **Vite Dev Server:**
   - File: `web-ui/vite.config.ts`
   - Look for: `server: { port: 5173 }`

2. **Specification API:**
   - File: `web-ui/server.js`
   - Look for: `const PORT = 3001`

3. **Collaboration Server:**
   - File: `web-ui/collaboration-server.js`
   - Look for: `const PORT = 8084`

4. **Shared Workspace API:**
   - File: `web-ui/shared-workspace-server.js`
   - Look for: `const PORT = 3002`

### Frontend API Clients

Update hardcoded URLs in these files:
- `web-ui/src/api/client.ts` (uses environment variables)
- `web-ui/src/context/WorkspaceContext.tsx`
- `web-ui/src/context/CollaborationContext.tsx`
- `web-ui/src/pages/Ideation.tsx`
- `web-ui/src/pages/System.tsx`
- `web-ui/src/pages/Analyze.tsx`
- `web-ui/src/pages/Designs.tsx`
- `web-ui/src/pages/AIPrinciples.tsx`
- `web-ui/src/components/AssetsPane.tsx`
- `web-ui/src/components/FolderBrowser.tsx`
- `web-ui/src/components/WorkspaceIntegrations.tsx`

## Checking Port Availability

### macOS/Linux

Check if a port is in use:
```bash
lsof -i :8080
```

Check multiple ports:
```bash
lsof -i :8080 -i :8081 -i :8082 -i :8083
```

Find which process is using a port:
```bash
lsof -i :8080 | grep LISTEN
```

Kill a process on a specific port:
```bash
lsof -ti:8080 | xargs kill
```

### Using netstat (Alternative)

```bash
netstat -an | grep LISTEN | grep 8080
```

## Troubleshooting

### Port Already in Use

If you get "port already in use" errors:

1. **Find what's using the port:**
   ```bash
   lsof -i :8080
   ```

2. **Stop the process:**
   ```bash
   # Stop specific process
   kill -9 <PID>

   # Or stop all Node processes
   pkill node
   ```

3. **Verify port is free:**
   ```bash
   lsof -i :8080
   # Should return nothing
   ```

### Services Not Connecting

If services can't connect to each other after port changes:

1. **Verify environment variables:**
   ```bash
   cat .env
   cat web-ui/.env
   ```

2. **Check Docker container ports:**
   ```bash
   docker-compose ps
   ```

3. **Restart all services:**
   ```bash
   docker-compose down
   docker-compose up -d
   ```

4. **Check logs:**
   ```bash
   docker-compose logs integration-service
   docker-compose logs design-service
   ```

### Frontend Can't Connect to Backend

1. **Check backend is running:**
   ```bash
   curl http://localhost:8080/health
   ```

2. **Verify CORS settings** in backend services

3. **Check browser console** for connection errors

4. **Verify environment variables** are loaded:
   - Check Network tab in browser dev tools
   - Verify URLs in requests

## Restoring from Backup

If something goes wrong, restore from the automatic backup:

```bash
# Find your backup directory
ls -la .port-backup-*

# Restore specific file
cp .port-backup-TIMESTAMP/.env .

# Or restore all files
cp .port-backup-TIMESTAMP/* .
cp .port-backup-TIMESTAMP/vite.config.ts web-ui/
cp .port-backup-TIMESTAMP/server.js web-ui/
# etc.
```

## Port Range Recommendations

### Development (1024-49151)

- **1024-9999**: Commonly used ports, higher chance of conflicts
- **10000-19999**: Less common, good for custom services
- **20000-49151**: Registered ports, safer range

### Private/Dynamic Ports (49152-65535)

- Generally safe from conflicts
- May require special permissions on some systems
- Not recommended for production

## Security Considerations

1. **Firewall Rules**: Update firewall rules when changing ports
2. **Reverse Proxy**: Consider using nginx/Apache on standard ports (80/443)
3. **SSL/TLS**: Configure SSL certificates for production deployments
4. **Port Forwarding**: Update router/network port forwarding rules
5. **Documentation**: Always document custom port configurations

## Production Deployment

For production, consider using:
- **Reverse proxy** (nginx/Apache) on standard HTTP/HTTPS ports
- **Environment-specific** configuration files
- **Container orchestration** (Kubernetes) for port management
- **Service mesh** for internal service communication

## Support

If you encounter issues with port configuration:

1. Check logs: `docker-compose logs`
2. Verify backups: `ls .port-backup-*`
3. Review this guide
4. Check GitHub issues

## Version History

- **v1.0** (2025-01-25): Initial port configuration documentation
