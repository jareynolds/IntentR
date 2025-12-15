# Running Multiple UbeCode Instances on the Same Server

## Overview

**YES, you can run two (or more) separate instances of the UbeCode application on the same server.**

This guide explains how to set up and manage multiple instances safely without conflicts.

## Quick Answer

With the current implementation, you can run multiple instances by:
1. ✅ Copying the project to different directories
2. ✅ Using the port configuration script to assign different ports
3. ✅ Setting unique Docker Compose project names
4. ✅ Using different environment variables

## What Changes Are Needed

### Current Implementation Status

✅ **Already Compatible:**
- Port configuration system allows custom ports per instance
- PID files are directory-scoped (`.pids/` in each directory)
- Log files are directory-scoped (`logs/` in each directory)
- Startup scripts work independently per directory
- Frontend localStorage is user-scoped

⚠️ **Needs Configuration:**
- Docker Compose project names (to avoid container name conflicts)
- Docker volumes (to avoid volume name conflicts)
- Docker networks (to avoid network name conflicts)
- Environment variables (different API keys, etc.)

## Step-by-Step Setup

### Instance 1: Primary Instance (Port 9000 range)

```bash
# 1. Set up first instance (default location)
cd /path/to/ubecode
export COMPOSE_PROJECT_NAME=ubecode-primary

# 2. Configure ports (use suggested ports - 9000 range)
./scripts/change-ports.sh
# Choose option 1 (9000 range)

# 3. Configure environment
cat > .env << 'EOF'
COMPOSE_PROJECT_NAME=ubecode-primary
FIGMA_TOKEN=your_figma_token_1
ANTHROPIC_API_KEY=your_api_key_1
INTEGRATION_SERVICE_PORT=9080
DESIGN_SERVICE_PORT=9081
CAPABILITY_SERVICE_PORT=9082
AUTH_SERVICE_PORT=9083
NETWORK_NAME=ubecode-network-primary
EOF

# 4. Start instance
./start.sh --build
```

### Instance 2: Secondary Instance (Port 7000 range)

```bash
# 1. Copy to new directory
cp -r /path/to/ubecode /path/to/ubecode-instance2
cd /path/to/ubecode-instance2

# 2. Configure ports (use 7000 range to avoid conflicts)
./scripts/change-ports.sh
# Choose option 2 and enter:
#   Integration: 7080
#   Design: 7081
#   Capability: 7082
#   Auth: 7083
#   Collaboration: 7084
#   Spec API: 7001
#   Shared WS: 7002
#   Vite: 7173
#   PostgreSQL: 7432

# 3. Set unique Docker Compose project name
export COMPOSE_PROJECT_NAME=ubecode-secondary

# 4. Configure environment
cat > .env << 'EOF'
COMPOSE_PROJECT_NAME=ubecode-secondary
FIGMA_TOKEN=your_figma_token_2
ANTHROPIC_API_KEY=your_api_key_2
INTEGRATION_SERVICE_PORT=7080
DESIGN_SERVICE_PORT=7081
CAPABILITY_SERVICE_PORT=7082
AUTH_SERVICE_PORT=7083
NETWORK_NAME=ubecode-network-secondary
EOF

# 5. Update docker-compose.yml network name
sed -i.bak 's/ubecode-network:/ubecode-network-secondary:/' docker-compose.yml

# 6. Start instance
./start.sh --build
```

## Verification

After starting both instances:

```bash
# Check Instance 1
curl http://localhost:9080/health  # Integration Service
curl http://localhost:6173         # Frontend
./status.sh                        # In instance 1 directory

# Check Instance 2
curl http://localhost:7080/health  # Integration Service
curl http://localhost:7173         # Frontend
cd /path/to/ubecode-instance2
./status.sh                        # In instance 2 directory

# Check all ports
lsof -i :6173 -i :7173 -i :9080 -i :7080 -i :9081 -i :7081
```

## Port Allocation Example

### Instance 1 (Primary - Port 9000 range)

| Service | Port |
|---------|------|
| Vite Dev Server | 6173 |
| Integration Service | 9080 |
| Design Service | 9081 |
| Capability Service | 9082 |
| Auth Service | 9083 |
| Collaboration Server | 9084 |
| Specification API | 4001 |
| Shared Workspace API | 4002 |
| PostgreSQL | 6432 |

### Instance 2 (Secondary - Port 7000 range)

| Service | Port |
|---------|------|
| Vite Dev Server | 7173 |
| Integration Service | 7080 |
| Design Service | 7081 |
| Capability Service | 7082 |
| Auth Service | 7083 |
| Collaboration Server | 7084 |
| Specification API | 7001 |
| Shared Workspace API | 7002 |
| PostgreSQL | 7432 |

### Instance 3 (Tertiary - Port 10000+ range)

| Service | Port |
|---------|------|
| Vite Dev Server | 11173 |
| Integration Service | 10080 |
| Design Service | 10081 |
| Capability Service | 10082 |
| Auth Service | 10083 |
| Collaboration Server | 10084 |
| Specification API | 11001 |
| Shared Workspace API | 11002 |
| PostgreSQL | 15432 |

## Docker Compose Project Names

**Why This Matters:**
Docker Compose uses the project name as a prefix for:
- Container names: `{project}_integration-service_1`
- Network names: `{project}_ubecode-network`
- Volume names: `{project}_postgres_data`

**Setting Project Names:**

Method 1: Environment variable (recommended):
```bash
export COMPOSE_PROJECT_NAME=ubecode-instance1
./start.sh
```

Method 2: Add to .env file:
```bash
echo "COMPOSE_PROJECT_NAME=ubecode-instance1" >> .env
```

Method 3: Use -p flag:
```bash
docker-compose -p ubecode-instance1 up -d
```

## Managing Multiple Instances

### Starting Instances

```bash
# Start Instance 1
cd /path/to/ubecode-instance1
export COMPOSE_PROJECT_NAME=ubecode-primary
./start.sh

# Start Instance 2
cd /path/to/ubecode-instance2
export COMPOSE_PROJECT_NAME=ubecode-secondary
./start.sh
```

### Checking Status

```bash
# Instance 1 status
cd /path/to/ubecode-instance1
./status.sh

# Instance 2 status
cd /path/to/ubecode-instance2
./status.sh

# Or check all Docker containers
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

### Stopping Instances

```bash
# Stop Instance 1
cd /path/to/ubecode-instance1
./stop.sh

# Stop Instance 2
cd /path/to/ubecode-instance2
./stop.sh
```

### Viewing Logs

```bash
# Instance 1 logs
cd /path/to/ubecode-instance1
tail -f logs/vite-dev-server.log
docker-compose logs -f integration-service

# Instance 2 logs
cd /path/to/ubecode-instance2
tail -f logs/vite-dev-server.log
docker-compose logs -f integration-service
```

## Resource Considerations

### System Requirements Per Instance

- **RAM**: ~2GB per instance (Docker containers + Node.js)
- **CPU**: 2-4 cores recommended per instance
- **Disk**: ~500MB for images + data storage
- **Ports**: 9 ports per instance

### Recommended Server Specs

- **2 Instances**: 8GB RAM, 4 cores
- **3 Instances**: 12GB RAM, 6 cores
- **4+ Instances**: Consider container orchestration (Kubernetes)

## Isolation Between Instances

### What's Isolated

✅ **Fully Isolated:**
- Network ports (different for each instance)
- Docker containers (different project names)
- Docker networks (different names)
- Docker volumes (different names)
- Process IDs (different PID files)
- Log files (different directories)
- Configuration files (different directories)

✅ **Partially Isolated:**
- Frontend localStorage (isolated per user email)
- Workspace data (stored in localStorage per domain/port)

⚠️ **Shared Resources:**
- Server RAM and CPU
- Docker daemon
- File system space

## Potential Conflicts

### Port Conflicts

**Problem:** Two instances try to use the same port
**Solution:** Use `./scripts/change-ports.sh` to assign different ports

**Detection:**
```bash
lsof -i :9080  # Check if port is in use
```

### Docker Name Conflicts

**Problem:** Container/network/volume names collide
**Solution:** Use `COMPOSE_PROJECT_NAME` environment variable

**Detection:**
```bash
docker ps -a --format "table {{.Names}}\t{{.Image}}"
docker network ls
docker volume ls
```

### Database Conflicts

**Problem:** Both instances try to use same volume name
**Solution:** Automatically handled by COMPOSE_PROJECT_NAME

**Verification:**
```bash
docker volume ls | grep postgres_data
# Should show:
# ubecode-primary_postgres_data
# ubecode-secondary_postgres_data
```

## Best Practices

### 1. Use Descriptive Instance Names

```bash
# Good
export COMPOSE_PROJECT_NAME=ubecode-production
export COMPOSE_PROJECT_NAME=ubecode-staging
export COMPOSE_PROJECT_NAME=ubecode-development

# Avoid
export COMPOSE_PROJECT_NAME=instance1
export COMPOSE_PROJECT_NAME=instance2
```

### 2. Document Your Port Allocations

Create a port allocation file for your server:

```bash
cat > /etc/ubecode-ports.conf << 'EOF'
# UbeCode Instance Port Allocations

# Production (9000 range)
ubecode-production: 6173, 9080-9084, 4001-4002, 6432

# Staging (7000 range)
ubecode-staging: 7173, 7080-7084, 7001-7002, 7432

# Development (10000 range)
ubecode-development: 11173, 10080-10084, 11001-11002, 15432
EOF
```

### 3. Use Shell Aliases

Add to your `.bashrc` or `.zshrc`:

```bash
# UbeCode instance management
alias ubecode-prod='cd /path/to/ubecode-production && export COMPOSE_PROJECT_NAME=ubecode-production'
alias ubecode-staging='cd /path/to/ubecode-staging && export COMPOSE_PROJECT_NAME=ubecode-staging'
alias ubecode-dev='cd /path/to/ubecode-development && export COMPOSE_PROJECT_NAME=ubecode-development'

# Quick commands
alias ubecode-prod-start='ubecode-prod && ./start.sh'
alias ubecode-prod-stop='ubecode-prod && ./stop.sh'
alias ubecode-prod-status='ubecode-prod && ./status.sh'
```

### 4. Automate Instance Startup

Create systemd services for production:

```bash
# /etc/systemd/system/ubecode-production.service
[Unit]
Description=UbeCode Production Instance
After=docker.service

[Service]
Type=forking
WorkingDirectory=/path/to/ubecode-production
Environment="COMPOSE_PROJECT_NAME=ubecode-production"
ExecStart=/path/to/ubecode-production/start.sh
ExecStop=/path/to/ubecode-production/stop.sh
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

### 5. Monitor All Instances

Use a monitoring script:

```bash
#!/bin/bash
# monitor-all-instances.sh

echo "=== UbeCode Instance Status ==="
echo ""

for instance in production staging development; do
    echo "[$instance]"
    cd /path/to/ubecode-$instance
    export COMPOSE_PROJECT_NAME=ubecode-$instance
    ./status.sh
    echo ""
done
```

## Troubleshooting Multiple Instances

### Problem: Instances Won't Start

**Check:**
1. Are ports already in use? `lsof -i :[port]`
2. Is COMPOSE_PROJECT_NAME set? `echo $COMPOSE_PROJECT_NAME`
3. Are Docker containers from another instance running? `docker ps`

**Solution:**
```bash
# Stop all Docker containers for an instance
cd /path/to/instance
export COMPOSE_PROJECT_NAME=ubecode-instancename
docker-compose down

# Check for port conflicts
./scripts/change-ports.sh

# Restart
./start.sh --build
```

### Problem: Can't Tell Which Instance Is Running

**Solution:**
```bash
# Check all UbeCode containers
docker ps --filter "name=ubecode" --format "table {{.Names}}\t{{.Ports}}"

# Check all UbeCode ports
lsof -i :6173 -i :7173 -i :11173 | grep LISTEN
```

### Problem: Instances Interfere With Each Other

**This shouldn't happen if:**
- ✓ Different ports are configured
- ✓ Different COMPOSE_PROJECT_NAME is set
- ✓ Instances are in different directories

**Verify isolation:**
```bash
# Check containers
docker ps --format "{{.Names}}" | grep ubecode

# Check networks
docker network ls | grep ubecode

# Check volumes
docker volume ls | grep ubecode
```

## Production Deployment

For production multi-instance deployment, consider:

1. **Reverse Proxy** (nginx/Apache)
   ```nginx
   # nginx config
   server {
       listen 80;
       server_name production.ubecode.com;
       location / {
           proxy_pass http://localhost:6173;
       }
   }

   server {
       listen 80;
       server_name staging.ubecode.com;
       location / {
           proxy_pass http://localhost:7173;
       }
   }
   ```

2. **Firewall Rules**
   ```bash
   # Only allow access to frontend ports
   ufw allow 80/tcp
   ufw allow 443/tcp
   ufw deny 6173/tcp
   ufw deny 7173/tcp
   ```

3. **Resource Limits**
   ```bash
   # docker-compose.yml
   services:
     integration-service:
       deploy:
         resources:
           limits:
             cpus: '1.0'
             memory: 1G
   ```

## Summary

**Yes, you can run multiple instances!** The current implementation supports it with these steps:

1. ✅ Copy project to different directories
2. ✅ Run `./scripts/change-ports.sh` in each instance
3. ✅ Set unique `COMPOSE_PROJECT_NAME` for each instance
4. ✅ Use `./start.sh` to start each instance independently
5. ✅ Use `./status.sh` to monitor each instance
6. ✅ Use `./stop.sh` to stop each instance

The port configuration system and startup scripts are fully compatible with running multiple instances on the same server.

## Quick Reference

```bash
# Instance 1 (Production)
cd /opt/ubecode-prod
export COMPOSE_PROJECT_NAME=ubecode-prod
./start.sh
# Access: http://localhost:6173

# Instance 2 (Staging)
cd /opt/ubecode-staging
export COMPOSE_PROJECT_NAME=ubecode-staging
./start.sh
# Access: http://localhost:7173

# Check both
docker ps --filter "name=ubecode" --format "table {{.Names}}\t{{.Status}}"
```
