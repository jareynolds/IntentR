# IntentR Administration Scripts

This directory contains utility scripts for system administrators to manage and configure the IntentR application.

## Quick Start Scripts (Root Directory)

These essential scripts are located in the root directory for easy access:

### `start.sh` ⭐
Start the entire IntentR application with one command.

**Usage:**
```bash
./start.sh              # Basic start
./start.sh --build      # Force rebuild
./start.sh --logs       # Show Docker logs
./start.sh --fg         # Run Vite in foreground
```

**What it does:**
- Checks prerequisites (Docker, Node.js)
- Starts Docker services (PostgreSQL, backend services)
- Starts Node.js servers (Specification API, Collaboration, Shared Workspace)
- Starts frontend dev server (Vite)
- Shows service URLs and status

### `stop.sh`
Stop all IntentR services cleanly.

**Usage:**
```bash
./stop.sh               # Stop all services
./stop.sh --clean       # Stop and remove volumes (deletes database)
```

**What it does:**
- Stops Node.js services
- Stops Docker containers
- Cleans up PID files
- Verifies ports are released

### `status.sh`
Check the status of all services.

**Usage:**
```bash
./status.sh             # One-time status check
./status.sh --watch     # Continuous monitoring
```

**Shows:**
- Docker container status and health
- Node.js process status (PID, port)
- HTTP health check results
- Port usage summary

See: [STARTUP-GUIDE.md](../STARTUP-GUIDE.md) for detailed startup documentation

---

## Available Scripts

### Port Configuration

#### `change-ports.sh`
Interactive script to change all service ports system-wide.

**Usage:**
```bash
./scripts/change-ports.sh
```

**Features:**
- Interactive port selection (suggested or custom)
- Automatic backup of all configuration files
- Updates all service configurations
- Validates port numbers
- Checks for port availability

**Options:**
1. **Suggested Ports** - Uses pre-configured safe port ranges (9000 range)
2. **Custom Ports** - Manually specify each service port
3. **Exit** - Exit without making changes

**What it updates:**
- Root `.env` file
- `docker-compose.yml`
- All frontend configuration files
- Source code with hardcoded URLs
- Node.js server files

**After running:**
1. Restart Docker services: `docker-compose down && docker-compose build && docker-compose up -d`
2. Restart Node.js servers
3. Restart frontend dev server

See: [`PORT-CONFIGURATION.md`](PORT-CONFIGURATION.md) for detailed documentation

#### `PORT-CONFIGURATION.md`
Comprehensive documentation about port usage, configuration, and troubleshooting.

**Includes:**
- Complete port inventory
- Suggested alternative port sets
- Common port conflicts
- Manual configuration guide
- Troubleshooting steps
- Security considerations
- Production deployment guidance

#### `PORT-QUICK-REFERENCE.md`
Quick reference guide for common port-related tasks.

**Includes:**
- Quick command reference
- Port checking commands
- Service restart procedures
- Health check commands

## Quick Start

### Change All Ports (Recommended Method)

1. **Run the port configuration script:**
   ```bash
   ./scripts/change-ports.sh
   ```

2. **Choose option 1** to use suggested ports (9000 range)

3. **Restart services:**
   ```bash
   docker-compose down
   docker-compose build
   docker-compose up -d
   cd web-ui
   node server.js &
   node collaboration-server.js &
   node shared-workspace-server.js &
   npm run dev
   ```

### Check Current Port Usage

```bash
# All IntentR services
lsof -i :8080 -i :8081 -i :8082 -i :8083 -i :8084 -i :3001 -i :3002 -i :5173

# Specific service
lsof -i :8080
```

### Verify Services After Port Change

```bash
# Check Docker services
docker-compose ps

# Test backend services
curl http://localhost:9080/health  # Integration
curl http://localhost:9081/health  # Design
curl http://localhost:9082/health  # Capability
curl http://localhost:9083/health  # Auth

# Test Node.js services
curl http://localhost:4001/api/health  # Specification API
curl http://localhost:4002/api/health  # Shared Workspace

# Open frontend
open http://localhost:6173
```

## Port Ranges

### Current Default Ports
```
8080-8084 - Backend Go services + Collaboration
3001-3002 - Node.js APIs
5173      - Vite dev server
5432      - PostgreSQL
```

### Suggested Alternatives

**Option 1: 9000 Range (Safest)**
```
9080-9084 - Backend services
4001-4002 - Node.js APIs
6173      - Vite dev server
6432      - PostgreSQL
```

**Option 2: 7000 Range**
```
7080-7084 - Backend services
7001-7002 - Node.js APIs
7173      - Vite dev server
7432      - PostgreSQL
```

**Option 3: 10000+ Range (Highest compatibility)**
```
10080-10084 - Backend services
11001-11002 - Node.js APIs
11173       - Vite dev server
15432       - PostgreSQL
```

## Backup and Restore

### Automatic Backups

The `change-ports.sh` script automatically creates timestamped backups:
```
.port-backup-YYYYMMDD-HHMMSS/
```

### Restore from Backup

```bash
# List backups
ls -la .port-backup-*

# Restore all files from specific backup
BACKUP_DIR=.port-backup-20250125-143000

# Root files
cp $BACKUP_DIR/.env .
cp $BACKUP_DIR/docker-compose.yml .

# Frontend files
cp $BACKUP_DIR/vite.config.ts web-ui/
cp $BACKUP_DIR/server.js web-ui/
cp $BACKUP_DIR/collaboration-server.js web-ui/
cp $BACKUP_DIR/shared-workspace-server.js web-ui/
cp $BACKUP_DIR/WorkspaceContext.tsx web-ui/src/context/
cp $BACKUP_DIR/CollaborationContext.tsx web-ui/src/context/
cp $BACKUP_DIR/Ideation.tsx web-ui/src/pages/

# Restart services
docker-compose down && docker-compose up -d
```

## Troubleshooting

### Port Already in Use

```bash
# Find what's using the port
lsof -i :8080

# Kill the process
lsof -ti:8080 | xargs kill -9

# Or kill all Node.js processes
pkill node
```

### Service Won't Start

1. **Check logs:**
   ```bash
   docker-compose logs integration-service
   docker-compose logs design-service
   ```

2. **Verify configuration:**
   ```bash
   cat .env
   cat web-ui/.env
   ```

3. **Check port availability:**
   ```bash
   lsof -i :8080
   ```

### Frontend Can't Connect to Backend

1. **Check environment variables:**
   ```bash
   cat web-ui/.env
   ```

2. **Verify backend is running:**
   ```bash
   curl http://localhost:8080/health
   ```

3. **Check browser console** for connection errors

4. **Restart frontend:**
   ```bash
   cd web-ui
   npm run dev
   ```

## Common Commands

### Start/Stop Services

```bash
# Stop all services
docker-compose down
cd web-ui && pkill node

# Start Docker services
docker-compose up -d

# Start Node.js servers
cd web-ui
node server.js &
node collaboration-server.js &
node shared-workspace-server.js &

# Start frontend dev server
npm run dev
```

### Check Service Status

```bash
# Docker services
docker-compose ps

# Check ports
lsof -i :8080 -i :8081 -i :8082 -i :8083

# Test health endpoints
for port in 8080 8081 8082 8083; do
  echo "Port $port: $(curl -s http://localhost:$port/health | jq -r .status)"
done
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f integration-service

# Node.js servers (if running in background)
tail -f web-ui/server.log
tail -f web-ui/collaboration-server.log
```

## Production Considerations

### Using Standard HTTP/HTTPS Ports

For production, consider using a reverse proxy:

```nginx
# nginx example
server {
    listen 80;
    server_name intentr.example.com;

    location /api/integration {
        proxy_pass http://localhost:9080;
    }

    location /api/design {
        proxy_pass http://localhost:9081;
    }

    location / {
        proxy_pass http://localhost:6173;
    }
}
```

### Environment Variables

Use environment-specific configuration:

```bash
# .env.production
INTEGRATION_SERVICE_PORT=9080
DESIGN_SERVICE_PORT=9081
# etc...

# .env.development
INTEGRATION_SERVICE_PORT=8080
DESIGN_SERVICE_PORT=8081
# etc...
```

### Security

1. **Firewall**: Configure firewall rules for custom ports
2. **SSL/TLS**: Use SSL certificates in production
3. **Access Control**: Restrict port access to necessary IPs
4. **Monitoring**: Set up port monitoring alerts

## Additional Resources

- [PORT-CONFIGURATION.md](PORT-CONFIGURATION.md) - Detailed port configuration guide
- [PORT-QUICK-REFERENCE.md](PORT-QUICK-REFERENCE.md) - Quick command reference
- [setup/README-SETUP.md](setup/README-SETUP.md) - General setup instructions

## Support

For issues with port configuration:

1. Check the documentation files in this directory
2. Review backup files: `ls .port-backup-*`
3. Check logs: `docker-compose logs`
4. Open an issue on GitHub

## Script Development

### Adding New Services

When adding new services that use ports:

1. Update `change-ports.sh` to include the new port
2. Add port to documentation files
3. Update docker-compose.yml if needed
4. Add health check for the new service

### Testing Changes

Always test port configuration changes in development before production:

```bash
# Test script without applying changes
echo "3" | ./scripts/change-ports.sh

# Apply to development environment first
./scripts/change-ports.sh
# Choose option 1 (suggested ports)

# Verify all services work
# Then apply to production
```

## Version History

- **v1.0** (2025-01-25): Initial port configuration tooling
  - Created `change-ports.sh` script
  - Added comprehensive documentation
  - Automatic backup system
  - Interactive port selection
