# IntentR Application Startup Guide

## Quick Start

### Start Everything
```bash
./start.sh
```

### Check Status
```bash
./status.sh
```

### Stop Everything
```bash
./stop.sh
```

That's it! The application will be available at **http://localhost:6173**

---

## Detailed Usage

### Starting the Application

The `start.sh` script handles the complete startup sequence:

```bash
# Basic start
./start.sh

# Force rebuild Docker containers
./start.sh --build

# Show Docker logs after starting
./start.sh --logs

# Run frontend in foreground (default is background)
./start.sh --fg
```

**What it does:**
1. ✓ Checks prerequisites (Docker, Node.js, npm)
2. ✓ Verifies .env configuration
3. ✓ Installs npm dependencies if needed
4. ✓ Stops any running services
5. ✓ Starts Docker services (PostgreSQL, backend services)
6. ✓ Waits for services to be healthy
7. ✓ Starts Node.js servers (Specification API, Collaboration, Shared Workspace)
8. ✓ Starts frontend dev server (Vite)
9. ✓ Displays service URLs and management commands

**First-time startup:**
```bash
# Will take longer to build Docker images
./start.sh --build
```

### Checking Service Status

The `status.sh` script shows real-time status of all services:

```bash
# One-time status check
./status.sh

# Continuous monitoring (refreshes every 5 seconds)
./status.sh --watch
```

**Status information includes:**
- Docker container status and health
- Node.js process status (PID, port)
- HTTP health check results
- Port usage summary
- Service URLs

### Stopping the Application

The `stop.sh` script cleanly shuts down all services:

```bash
# Stop all services (keeps data)
./stop.sh

# Stop and remove containers + volumes (DELETES DATABASE)
./stop.sh --clean
```

**What it does:**
1. Stops Node.js services (Vite, APIs, servers)
2. Cleans up any stray Node.js processes
3. Stops Docker containers
4. Verifies all ports are released
5. Optionally removes containers and volumes

---

## Service Architecture

### Docker Services (Managed by docker-compose)

| Service | Port | Description |
|---------|------|-------------|
| **PostgreSQL** | 6432 | Database server |
| **Integration Service** | 9080 | Figma integration and AI analysis |
| **Design Service** | 9081 | Design artifact management |
| **Capability Service** | 9082 | SAFe capability tracking |
| **Auth Service** | 9083 | Authentication service |

### Node.js Services (Managed by start/stop scripts)

| Service | Port | File | Log |
|---------|------|------|-----|
| **Specification API** | 4001 | `web-ui/server.js` | `logs/specification-api.log` |
| **Collaboration Server** | 9084 | `web-ui/collaboration-server.js` | `logs/collaboration-server.log` |
| **Shared Workspace API** | 4002 | `web-ui/shared-workspace-server.js` | `logs/shared-workspace-server.log` |
| **Vite Dev Server** | 6173 | `web-ui/` | `logs/vite-dev-server.log` |

---

## Prerequisites

### Required Software

1. **Docker** (version 20.10+)
   - Download: https://docs.docker.com/get-docker/
   - Verify: `docker --version`

2. **Docker Compose** (version 1.29+ or v2)
   - Usually included with Docker Desktop
   - Verify: `docker-compose --version`

3. **Node.js** (version 18+)
   - Download: https://nodejs.org/
   - Verify: `node --version`

4. **npm** (comes with Node.js)
   - Verify: `npm --version`

### Configuration

1. **Environment Variables** (`.env` file):
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

   Required variables:
   - `FIGMA_TOKEN` - For Figma integration (get from https://figma.com/developers)
   - `ANTHROPIC_API_KEY` - For AI features (optional)

2. **Frontend Dependencies**:
   ```bash
   cd web-ui
   npm install
   ```
   (Or let `start.sh` install them automatically)

---

## Troubleshooting

### Services Won't Start

**Check if ports are in use:**
```bash
lsof -i :6173 -i :9080 -i :9081 -i :9082 -i :9083 -i :9084 -i :4001 -i :4002
```

**Kill processes on specific port:**
```bash
lsof -ti:9080 | xargs kill -9
```

**Force stop and restart:**
```bash
./stop.sh
docker-compose down -v  # WARNING: Deletes database
./start.sh --build
```

### Docker Issues

**Docker daemon not running:**
```bash
# macOS
open -a Docker

# Linux
sudo systemctl start docker
```

**Build failures:**
```bash
# Clean Docker cache
docker system prune -a
./start.sh --build
```

**Container not healthy:**
```bash
# Check logs
docker-compose logs integration-service
docker-compose logs design-service
docker-compose logs capability-service
docker-compose logs auth-service

# Restart specific service
docker-compose restart integration-service
```

### Node.js Services Issues

**Service won't start:**
```bash
# Check if port is in use
lsof -i :4001

# Check logs
tail -f logs/specification-api.log
tail -f logs/collaboration-server.log
tail -f logs/shared-workspace-server.log

# Manual start (for debugging)
cd web-ui
node server.js
```

**Stale PID files:**
```bash
# Remove PID files
rm -rf .pids/

# Restart services
./start.sh
```

### Frontend Issues

**Vite won't start:**
```bash
# Check log
tail -f logs/vite-dev-server.log

# Kill any existing Vite processes
pkill -f vite

# Start manually
cd web-ui
npm run dev
```

**Dependencies missing:**
```bash
cd web-ui
rm -rf node_modules package-lock.json
npm install
```

### Database Issues

**Connection errors:**
```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Check PostgreSQL logs
docker-compose logs postgres

# Connect to database (for debugging)
docker-compose exec postgres psql -U intentr_user -d intentr_db
```

**Reset database:**
```bash
./stop.sh --clean  # WARNING: Deletes all data
./start.sh --build
```

### Health Check Failures

**Service responds but unhealthy:**
```bash
# Check specific health endpoint
curl http://localhost:9080/health
curl http://localhost:9081/health
curl http://localhost:9082/health
curl http://localhost:9083/health

# View container details
docker inspect $(docker-compose ps -q integration-service)
```

---

## Viewing Logs

### Real-time Logs

**All Docker services:**
```bash
docker-compose logs -f
```

**Specific Docker service:**
```bash
docker-compose logs -f integration-service
docker-compose logs -f design-service
docker-compose logs -f capability-service
docker-compose logs -f auth-service
docker-compose logs -f postgres
```

**Node.js services:**
```bash
tail -f logs/specification-api.log
tail -f logs/collaboration-server.log
tail -f logs/shared-workspace-server.log
tail -f logs/vite-dev-server.log
```

**All logs at once:**
```bash
tail -f logs/*.log
```

### Log Files

All Node.js service logs are stored in the `logs/` directory:
- `logs/specification-api.log`
- `logs/collaboration-server.log`
- `logs/shared-workspace-server.log`
- `logs/vite-dev-server.log`

Docker logs can be viewed with `docker-compose logs`.

---

## Development Workflow

### Typical Development Session

```bash
# 1. Start all services
./start.sh

# 2. Check everything is running
./status.sh

# 3. Open application
open http://localhost:6173

# 4. Make code changes (hot reload enabled for frontend)

# 5. View logs if needed
tail -f logs/vite-dev-server.log

# 6. When done, stop everything
./stop.sh
```

### Restarting After Code Changes

**Frontend changes:**
- Hot reload automatic (no restart needed)

**Backend Go services:**
```bash
docker-compose restart integration-service
# or
docker-compose down
docker-compose up -d --build integration-service
```

**Node.js servers:**
```bash
# Stop and restart specific service
cd web-ui
pkill -f server.js
node server.js > ../logs/specification-api.log 2>&1 &
```

Or restart everything:
```bash
./stop.sh
./start.sh
```

### Working with Database

**Access database:**
```bash
docker-compose exec postgres psql -U intentr_user -d intentr_db
```

**Backup database:**
```bash
docker-compose exec postgres pg_dump -U intentr_user intentr_db > backup.sql
```

**Restore database:**
```bash
cat backup.sql | docker-compose exec -T postgres psql -U intentr_user -d intentr_db
```

---

## Production Deployment

For production deployment, see:
- Docker deployment guide (coming soon)
- Kubernetes deployment guide (coming soon)
- Environment configuration guide (coming soon)

**Key differences for production:**
1. Use production environment variables
2. Enable SSL/TLS
3. Use reverse proxy (nginx/Apache)
4. Configure proper logging
5. Set up monitoring and alerts
6. Use managed database service
7. Configure backup strategy

---

## Advanced Usage

### Running Specific Services Only

**Start only Docker services:**
```bash
docker-compose up -d
```

**Start only frontend:**
```bash
cd web-ui
npm run dev
```

**Start only backend APIs:**
```bash
cd web-ui
node server.js &
node collaboration-server.js &
node shared-workspace-server.js &
```

### Custom Port Configuration

If you need to change ports, use the port configuration script:
```bash
./scripts/change-ports.sh
```

See `scripts/PORT-CONFIGURATION.md` for details.

### Multiple Environments

Run multiple instances with different ports:

1. Copy the entire project directory
2. Run port configuration script in each
3. Update .env files with different values
4. Start each instance separately

---

## Quick Reference

### Essential Commands

| Command | Purpose |
|---------|---------|
| `./start.sh` | Start all services |
| `./stop.sh` | Stop all services |
| `./status.sh` | Check service status |
| `./status.sh --watch` | Monitor services continuously |
| `docker-compose logs -f` | View Docker logs |
| `tail -f logs/*.log` | View Node.js logs |

### Service URLs

| Service | URL |
|---------|-----|
| Frontend | http://localhost:6173 |
| Integration API | http://localhost:9080 |
| Design API | http://localhost:9081 |
| Capability API | http://localhost:9082 |
| Auth API | http://localhost:9083 |
| Collaboration | ws://localhost:9084 |
| Specification API | http://localhost:4001 |
| Shared Workspace | http://localhost:4002 |
| PostgreSQL | localhost:6432 |

### Health Checks

```bash
curl http://localhost:9080/health  # Integration Service
curl http://localhost:9081/health  # Design Service
curl http://localhost:9082/health  # Capability Service
curl http://localhost:9083/health  # Auth Service
curl http://localhost:4001/api/health  # Specification API
curl http://localhost:4002/api/health  # Shared Workspace API
```

---

## Getting Help

- **Documentation**: See files in `scripts/` directory
- **Logs**: Check `logs/` directory for Node.js services
- **Docker logs**: `docker-compose logs [service-name]`
- **Status check**: `./status.sh` shows current state
- **GitHub Issues**: Report bugs or ask questions

---

## Version History

- **v1.0** (2025-01-25): Initial startup script system
  - Automated startup/shutdown scripts
  - Service status monitoring
  - Comprehensive logging
  - Health checks for all services
