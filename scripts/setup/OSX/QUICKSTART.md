# UbeCode Microservices - macOS Quick Start Guide

Get your UbeCode microservices environment up and running on macOS in 10 minutes!

## Prerequisites

- macOS 11 (Big Sur) or later
- Apple Silicon (M1/M2/M3) or Intel Mac
- Admin access (for installing software)

## Quick Start (Two Options)

### Option 1: Automated Setup (Recommended)

Run the all-in-one setup script:

```bash
# Clone the repository
git clone https://github.com/jareynolds/ubecode.git
cd ubecode

# Make scripts executable
chmod +x scripts/setup/OSX/*.sh

# Run the complete setup
./scripts/setup/OSX/setup-osx-environment.sh
```

This will install everything automatically:
- Xcode Command Line Tools
- Homebrew
- Docker Desktop
- Go 1.24+
- Node.js
- All dependencies

**Estimated time: 10-15 minutes**

### Option 2: Step-by-Step Manual Setup

Run each script in numerical order (if a component is already installed, it will be skipped):

```bash
cd ubecode

# Make scripts executable
chmod +x scripts/setup/OSX/*.sh

# Step 1: Install dependencies (Homebrew, git, etc.)
./scripts/setup/OSX/1-install-dependencies.sh

# Step 2: Install Docker Desktop
./scripts/setup/OSX/2-install-docker.sh

# Step 3: Install Go
./scripts/setup/OSX/3-install-golang.sh

# Step 4: Configure environment
./scripts/setup/OSX/4-configure-environment.sh

# Step 5: Verify setup
./scripts/setup/OSX/5-verify-setup.sh
```

## After Setup

### Verify Installation

```bash
./scripts/setup/OSX/5-verify-setup.sh
```

### Start the Application

```bash
# Start all services
./start.sh

# Or use individual commands
make docker-build   # Build images
make docker-up      # Start Docker services
cd web-ui && npm run dev  # Start web UI
```

### Check Service Health

```bash
./scripts/setup/OSX/manage-services.sh health
```

## What's Running?

After setup, you have these services:

| Service | Port | URL |
|---------|------|-----|
| Web UI | 6173 | http://localhost:6173 |
| Integration Service | 9080 | http://localhost:9080/health |
| Design Service | 9081 | http://localhost:9081/health |
| Capability Service | 9082 | http://localhost:9082/health |
| Auth Service | 9083 | http://localhost:9083/health |
| PostgreSQL | 6432 | localhost:6432 |

## Common Commands

```bash
# Service Management
./scripts/setup/OSX/manage-services.sh start    # Start services
./scripts/setup/OSX/manage-services.sh stop     # Stop services
./scripts/setup/OSX/manage-services.sh status   # Show status
./scripts/setup/OSX/manage-services.sh health   # Check health
./scripts/setup/OSX/manage-services.sh logs     # View logs

# Build Commands
make docker-build    # Build Docker images
make docker-up       # Start Docker services
make docker-down     # Stop Docker services
make docker-logs     # View Docker logs

# Development
make build           # Build Go services locally
make test            # Run tests
make lint            # Run linter
```

## Troubleshooting

### Docker not starting?

1. Open Docker Desktop from Applications
2. Wait for it to fully initialize
3. Check status in menu bar

```bash
# Verify Docker is running
docker info
```

### Port already in use?

```bash
# Find what's using the port
lsof -i :9080

# Kill the process
kill -9 <PID>
```

### Go not found after install?

```bash
# Reload shell configuration
source ~/.zshrc   # or ~/.bashrc

# Verify
go version
```

### Homebrew issues on Apple Silicon?

```bash
# Add Homebrew to PATH
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
eval "$(/opt/homebrew/bin/brew shellenv)"
```

## Script Execution Order

If running scripts manually, follow the numerical order (scripts skip already-installed components):

```
1-install-dependencies.sh   - Homebrew, git, node, etc.
         ↓
2-install-docker.sh         - Docker Desktop
         ↓
3-install-golang.sh         - Go programming language
         ↓
4-configure-environment.sh  - Create .env file
         ↓
5-verify-setup.sh           - Verify everything works
```

**Note:** Each script checks if components are already installed and skips them, continuing to the next step.

## Next Steps

- **Configure API Keys**: Edit `.env` with your Figma and Anthropic API keys
- **Explore the UI**: Open http://localhost:6173
- **Read the Docs**: See `README.md` and `DEVELOPMENT_GUIDE.md`
- **Run Tests**: `make test`

## Need Help?

- **Full documentation**: `scripts/setup/OSX/README-SETUP.md`
- **Main README**: `README.md`
- **Verify setup**: `./scripts/setup/OSX/5-verify-setup.sh`

---

**Estimated Time**: 10-15 minutes
**Difficulty**: Easy
**Last Updated**: 2025-01-14
