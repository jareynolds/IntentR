# Troubleshooting Guide

## Common Issues and Solutions

### Workspace Folder Creation Fails

**Error:**
```
Failed to create folder
```

**Cause:** Hardcoded port 8080 references after port configuration change

**Solution:**
```bash
# Run the automated fix script
./scripts/fix-hardcoded-ports.sh

# Or manually update FolderBrowser component
# The integration service is on port 9080, not 8080
```

**What it fixes:**
- Updates all hardcoded `localhost:8080` to `localhost:9080`
- Fixes folder creation, file browsing, and API calls
- Creates automatic backup before making changes

---

### PostCSS/Autoprefixer Error

**Error:**
```
Failed to load PostCSS config: Cannot find module 'autoprefixer'
```

**Cause:** Missing npm dependencies

**Solution:**
```bash
cd web-ui
npm install
```

The updated `start.sh` script now automatically detects and installs missing dependencies.

---

### Port Already in Use

**Error:**
```
Error: listen EADDRINUSE: address already in use :::6173
```

**Cause:** Port is already occupied by another process

**Solution:**
```bash
# Find what's using the port
lsof -i :6173

# Kill the process
lsof -ti:6173 | xargs kill

# Or use the stop script
./stop.sh

# Then restart
./start.sh
```

---

### Docker Daemon Not Running

**Error:**
```
Cannot connect to the Docker daemon
```

**Solution:**
```bash
# macOS
open -a Docker

# Linux
sudo systemctl start docker

# Verify Docker is running
docker ps
```

---

### Container Build Fails

**Error:**
```
ERROR: failed to solve: process "/bin/sh -c go build..." did not complete successfully
```

**Solution:**
```bash
# Clean Docker cache
docker system prune -a

# Rebuild with no cache
./start.sh --build

# Or manually
docker-compose build --no-cache
```

---

### Database Connection Errors

**Error:**
```
pq: password authentication failed for user "intentr_user"
```

**Solution:**
```bash
# Reset the database
./stop.sh --clean  # WARNING: Deletes all data
./start.sh --build
```

---

### Node.js Version Issues

**Error:**
```
error: The module 'XXX' was compiled against a different Node.js version
```

**Solution:**
```bash
cd web-ui
rm -rf node_modules package-lock.json
npm install
```

---

### Permission Denied Errors

**Error:**
```
bash: ./start.sh: Permission denied
```

**Solution:**
```bash
chmod +x start.sh stop.sh status.sh
chmod +x scripts/change-ports.sh
```

---

### Stale PID Files

**Error:**
Service shows as running but isn't actually running

**Solution:**
```bash
# Remove stale PID files
rm -rf .pids/

# Stop and restart
./stop.sh
./start.sh
```

---

### Health Check Timeouts

**Error:**
```
✗ Integration Service (timeout)
```

**Solution:**
```bash
# Check Docker logs
docker-compose logs integration-service

# Check if .env is configured
cat .env

# Restart specific service
docker-compose restart integration-service
```

---

### Frontend Build Errors

**Error:**
```
[vite] Internal server error: Failed to resolve import
```

**Solution:**
```bash
cd web-ui

# Clear Vite cache
rm -rf node_modules/.vite

# Reinstall dependencies
npm install

# Or clear everything
rm -rf node_modules package-lock.json dist
npm install
```

---

### TypeScript Compilation Errors

**Error:**
```
error TS2339: Property 'X' does not exist on type 'Y'
```

**Solution:**
```bash
cd web-ui

# Clean TypeScript build cache
rm -rf tsconfig.tsbuildinfo

# Rebuild
npm run build
```

---

### Multiple Instance Conflicts

**Error:**
Two instances won't run simultaneously

**Solution:**
```bash
# Use different ports for each instance
cd /path/to/instance1
./scripts/change-ports.sh  # Choose option 1 (9000 range)

cd /path/to/instance2
./scripts/change-ports.sh  # Choose option 2 (7000 range)

# Set unique Docker project names
export COMPOSE_PROJECT_NAME=intentr-instance1  # In instance 1
export COMPOSE_PROJECT_NAME=intentr-instance2  # In instance 2

# Start each separately
./start.sh --build
```

See: [MULTI-INSTANCE-GUIDE.md](MULTI-INSTANCE-GUIDE.md) for detailed instructions

---

## Diagnostic Commands

### Check Service Status
```bash
# All services
./status.sh

# Watch mode
./status.sh --watch

# Docker containers only
docker-compose ps

# Specific service
docker-compose logs -f integration-service
```

### Check Ports
```bash
# All IntentR ports
lsof -i :6173 -i :9080 -i :9081 -i :9082 -i :9083 -i :9084 -i :4001 -i :4002

# Specific port
lsof -i :6173

# See what's listening on all ports
netstat -an | grep LISTEN
```

### Check Logs
```bash
# Node.js service logs
tail -f logs/specification-api.log
tail -f logs/collaboration-server.log
tail -f logs/shared-workspace-server.log
tail -f logs/vite-dev-server.log

# Docker service logs
docker-compose logs -f
docker-compose logs -f integration-service
docker-compose logs -f postgres

# All logs at once
tail -f logs/*.log
```

### Check Database
```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U intentr_user -d intentr_db

# Check if database is ready
docker-compose exec postgres pg_isready -U intentr_user

# View database logs
docker-compose logs postgres
```

### Check Network
```bash
# Docker networks
docker network ls

# Container IP addresses
docker inspect $(docker-compose ps -q integration-service) | grep IPAddress
```

### Check Resources
```bash
# Docker resource usage
docker stats

# Disk usage
docker system df

# Container details
docker inspect $(docker-compose ps -q integration-service)
```

---

## Clean Restart Procedure

If you encounter persistent issues, try a complete clean restart:

```bash
# 1. Stop everything
./stop.sh

# 2. Kill any stray processes
pkill node
pkill -f vite

# 3. Clean Docker
docker-compose down -v  # WARNING: Deletes database
docker system prune -a  # Optional: Cleans all Docker cache

# 4. Clean Node.js
cd web-ui
rm -rf node_modules package-lock.json dist .vite
npm install

# 5. Clean logs and PIDs
cd ..
rm -rf logs .pids

# 6. Rebuild and start
./start.sh --build
```

**WARNING:** This deletes all data. Only use if necessary.

---

## Getting More Help

1. **Check the logs** - Most issues are explained in log files
2. **Check status** - `./status.sh` shows what's working
3. **Read documentation:**
   - [STARTUP-GUIDE.md](STARTUP-GUIDE.md) - Detailed startup instructions
   - [MULTI-INSTANCE-GUIDE.md](MULTI-INSTANCE-GUIDE.md) - Running multiple instances
   - [scripts/PORT-CONFIGURATION.md](scripts/PORT-CONFIGURATION.md) - Port configuration
4. **GitHub Issues** - Report bugs or ask questions

---

## Quick Fixes Checklist

- [ ] Run `./stop.sh` then `./start.sh`
- [ ] Check if Docker is running: `docker ps`
- [ ] Check if ports are free: `lsof -i :6173`
- [ ] Verify .env file exists and has FIGMA_TOKEN
- [ ] Check Node.js version: `node --version` (need 18+)
- [ ] Check disk space: `df -h`
- [ ] Check logs: `tail -f logs/*.log`
- [ ] Run `./status.sh` to see what's broken
- [ ] Try `./stop.sh && ./start.sh --build`

---

## Prevention Tips

1. **Always use start/stop scripts** - Don't start services manually
2. **Check status regularly** - `./status.sh --watch`
3. **Keep dependencies updated** - `cd web-ui && npm update`
4. **Monitor logs** - Set up log rotation for long-running instances
5. **Use unique project names** - For multiple instances
6. **Document custom changes** - If you modify configuration
7. **Backup database** - Before running `--clean` flag
8. **Test in development** - Before deploying to production

---

## Error Code Reference

| Exit Code | Meaning |
|-----------|---------|
| 0 | Success |
| 1 | General error |
| 2 | Misuse of shell command |
| 126 | Command cannot execute |
| 127 | Command not found |
| 130 | Script terminated by Ctrl+C |

---

## Version-Specific Issues

### Node.js 20+
- Some packages may need rebuild: `npm rebuild`
- Check compatibility: `npm ls`

### Docker Desktop 4.x
- May need to increase memory in Docker settings
- Recommended: 4GB+ RAM for Docker

### macOS Specific
- May need to approve Docker in Security & Privacy
- Check firewall rules for port access

### Linux Specific
- May need sudo for Docker commands
- Check systemd for Docker service status

---

## Contact Support

If none of these solutions work:

1. Collect diagnostic information:
   ```bash
   ./status.sh > status.txt
   docker-compose logs > docker-logs.txt
   cat logs/*.log > node-logs.txt
   ```

2. Check system information:
   ```bash
   uname -a
   docker --version
   docker-compose --version
   node --version
   npm --version
   ```

3. Create an issue with:
   - Error message
   - Steps to reproduce
   - Diagnostic output
   - System information
