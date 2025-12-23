# IntentR Microservices - macOS Setup Guide

Complete guide for setting up the IntentR microservices environment on macOS.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Installation Methods](#installation-methods)
- [Script Execution Order](#script-execution-order)
- [Configuration](#configuration)
- [Service Management](#service-management)
- [Troubleshooting](#troubleshooting)
- [macOS Specific Notes](#macos-specific-notes)

## Overview

This directory contains scripts and documentation for setting up the IntentR microservices environment on macOS. The setup includes:

- **System Dependencies**: Git, wget, curl, make, jq, etc.
- **Homebrew**: macOS package manager
- **Docker Desktop**: Container runtime with Docker Compose
- **Go 1.24+**: Programming language runtime
- **Node.js**: For web UI development
- **IntentR Services**: Microservices (Integration, Design, Capability, Auth)

### Supported macOS Versions

- macOS 11 (Big Sur)
- macOS 12 (Monterey)
- macOS 13 (Ventura)
- macOS 14 (Sonoma)
- macOS 15 (Sequoia)

### Supported Architectures

- Apple Silicon (M1, M2, M3, M4) - arm64
- Intel - x86_64

## Prerequisites

### System Requirements

**Minimum:**
- macOS 11 or later
- 8 GB RAM
- 20 GB free disk space
- Internet connection

**Recommended:**
- macOS 13 or later
- 16 GB RAM
- 50 GB free disk space
- SSD storage

### Required Accounts (for full functionality)

| Service | Purpose | Get Token/Key |
|---------|---------|---------------|
| Figma | Design integration | [Figma Access Tokens](https://www.figma.com/developers/api#access-tokens) |
| Anthropic | AI chat features | [Anthropic Console](https://console.anthropic.com/account/keys) |

## Quick Start

### Option 1: Complete Automated Setup (Recommended)

```bash
# Clone the repository
git clone https://github.com/jareynolds/intentr.git
cd intentr

# Make scripts executable
chmod +x scripts/setup/OSX/*.sh

# Run the complete setup
./scripts/setup/OSX/setup-osx-environment.sh
```

### Option 2: Manual Step-by-Step Setup

Run scripts in numerical order (each script skips already-installed components):

```bash
cd intentr
chmod +x scripts/setup/OSX/*.sh

# Step 1: Install dependencies
./scripts/setup/OSX/1-install-dependencies.sh

# Step 2: Install Docker
./scripts/setup/OSX/2-install-docker.sh

# Step 3: Install Go
./scripts/setup/OSX/3-install-golang.sh

# Step 4: Configure environment
./scripts/setup/OSX/4-configure-environment.sh

# Step 5: Verify setup
./scripts/setup/OSX/5-verify-setup.sh
```

## Installation Methods

### Method 1: All-in-One Setup Script

**File**: `setup-osx-environment.sh`

The main setup script that runs all installation steps in sequence.

**What it does:**
1. Checks macOS version and architecture
2. Installs Xcode Command Line Tools
3. Installs Homebrew
4. Installs system dependencies
5. Installs Node.js
6. Installs Docker Desktop
7. Installs Go
8. Configures environment
9. Installs web UI dependencies
10. Validates installation

**Usage:**
```bash
./scripts/setup/OSX/setup-osx-environment.sh
```

### Method 2: Individual Component Scripts

**Note:** All scripts are idempotent - if a component is already installed, the script will skip it and continue.

#### Install System Dependencies

**File**: `1-install-dependencies.sh`

```bash
./scripts/setup/OSX/1-install-dependencies.sh
```

**Installs:**
- Xcode Command Line Tools
- Homebrew
- git, wget, curl, make, openssl, jq
- Node.js and npm

#### Install Docker

**File**: `2-install-docker.sh`

```bash
./scripts/setup/OSX/2-install-docker.sh
```

**Installs:**
- Docker Desktop for Mac
- Docker Compose (included with Docker Desktop)

#### Install Go

**File**: `3-install-golang.sh`

```bash
./scripts/setup/OSX/3-install-golang.sh [version]

# Examples:
./scripts/setup/OSX/3-install-golang.sh          # Latest via Homebrew
./scripts/setup/OSX/3-install-golang.sh 1.24.0   # Specific version
```

**Installs:**
- Go programming language
- Go development tools (goimports, golangci-lint)

## Script Execution Order

**IMPORTANT:** If running scripts manually, follow this exact order:

```
┌─────────────────────────────────────────┐
│  Step 1: install-dependencies.sh        │
│  Installs: Homebrew, git, node, etc.    │
└──────────────────┬──────────────────────┘
                   ↓
┌─────────────────────────────────────────┐
│  Step 2: install-docker.sh              │
│  Installs: Docker Desktop               │
└──────────────────┬──────────────────────┘
                   ↓
┌─────────────────────────────────────────┐
│  Step 3: install-golang.sh              │
│  Installs: Go 1.24+                     │
└──────────────────┬──────────────────────┘
                   ↓
┌─────────────────────────────────────────┐
│  Step 4: configure-environment.sh       │
│  Creates: .env file with API keys       │
└──────────────────┬──────────────────────┘
                   ↓
┌─────────────────────────────────────────┐
│  Step 5: verify-setup.sh                │
│  Validates: All components installed    │
└─────────────────────────────────────────┘
```

Each script indicates which step it is and what comes next.

## Configuration

### Environment Variables

**File**: `configure-environment.sh`

Create and configure the `.env` file:

```bash
# Interactive mode (prompts for values)
./scripts/setup/OSX/configure-environment.sh

# Non-interactive mode
./scripts/setup/OSX/configure-environment.sh --figma-token YOUR_TOKEN --anthropic-key YOUR_KEY
```

### Required Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `FIGMA_TOKEN` | Figma Personal Access Token | Yes (for Figma features) |
| `ANTHROPIC_API_KEY` | Anthropic API Key | Yes (for AI features) |
| `JWT_SECRET` | JWT signing secret | Auto-generated |

### Service Ports

| Service | Port | Environment Variable |
|---------|------|---------------------|
| Web UI | 6173 | `WEB_UI_PORT` |
| Integration Service | 9080 | `INTEGRATION_SERVICE_PORT` |
| Design Service | 9081 | `DESIGN_SERVICE_PORT` |
| Capability Service | 9082 | `CAPABILITY_SERVICE_PORT` |
| Auth Service | 9083 | `AUTH_SERVICE_PORT` |
| Collaboration Server | 9084 | `COLLABORATION_SERVER_PORT` |
| Specification API | 4001 | `SPECIFICATION_API_PORT` |
| Shared Workspace API | 4002 | `SHARED_WORKSPACE_PORT` |
| PostgreSQL | 6432 | `POSTGRES_PORT` |

### Getting API Keys

#### Figma Token

1. Log in to [Figma](https://www.figma.com)
2. Go to Settings (click your profile icon)
3. Scroll to "Personal Access Tokens"
4. Click "Generate new token"
5. Copy and save the token

#### Anthropic API Key

1. Go to [Anthropic Console](https://console.anthropic.com)
2. Sign in or create an account
3. Navigate to API Keys
4. Click "Create Key"
5. Copy and save the key

### Manual .env Configuration

Create `.env` file in project root:

```bash
# IntentR Environment Configuration

# API Keys
FIGMA_TOKEN=figd_your_token_here
ANTHROPIC_API_KEY=sk-ant-your_key_here
JWT_SECRET=your_generated_secret_here

# Ports
WEB_UI_PORT=6173
INTEGRATION_SERVICE_PORT=9080
DESIGN_SERVICE_PORT=9081
CAPABILITY_SERVICE_PORT=9082

# Database
POSTGRES_HOST=localhost
POSTGRES_PORT=6432
POSTGRES_USER=intentr_user
POSTGRES_PASSWORD=intentr_password
POSTGRES_DB=intentr_db

# Application
ENV=development
LOG_LEVEL=info
```

## Service Management

### Using the Management Script

**File**: `manage-services.sh`

```bash
# Start all services
./scripts/setup/OSX/manage-services.sh start

# Stop all services
./scripts/setup/OSX/manage-services.sh stop

# Restart services
./scripts/setup/OSX/manage-services.sh restart

# Show status
./scripts/setup/OSX/manage-services.sh status

# View logs
./scripts/setup/OSX/manage-services.sh logs

# Check health
./scripts/setup/OSX/manage-services.sh health

# Build images
./scripts/setup/OSX/manage-services.sh build

# Rebuild (no cache)
./scripts/setup/OSX/manage-services.sh rebuild

# Clean up
./scripts/setup/OSX/manage-services.sh clean

# Development mode (starts all services + web UI)
./scripts/setup/OSX/manage-services.sh dev
```

### Using Make Commands

```bash
# Build all services
make docker-build

# Start services
make docker-up

# Stop services
make docker-down

# View logs
make docker-logs

# Build and run locally (without Docker)
make run-integration  # Terminal 1
make run-design       # Terminal 2
make run-capability   # Terminal 3
```

### Using Docker Compose Directly

```bash
# Start services
docker compose up -d

# Stop services
docker compose down

# View logs
docker compose logs -f

# View status
docker compose ps

# Rebuild and start
docker compose up -d --build
```

## Verification

### Verify Setup Script

**File**: `verify-setup.sh`

Run comprehensive verification:

```bash
./scripts/setup/OSX/verify-setup.sh
```

**Checks:**
- macOS version and architecture
- Homebrew installation
- Docker status and permissions
- Go version and configuration
- Node.js and npm
- Environment file
- Project structure
- Port availability
- Network connectivity

### Manual Health Checks

```bash
# Check service health endpoints
curl http://localhost:9080/health  # Integration Service
curl http://localhost:9081/health  # Design Service
curl http://localhost:9082/health  # Capability Service
curl http://localhost:9083/health  # Auth Service

# Check Web UI
open http://localhost:6173

# Check Docker containers
docker compose ps

# Check port usage
lsof -i :9080
```

## Troubleshooting

### Common Issues

#### 1. Homebrew Not in PATH (Apple Silicon)

**Symptom:**
```
zsh: command not found: brew
```

**Solution:**
```bash
# Add to PATH
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
eval "$(/opt/homebrew/bin/brew shellenv)"

# Verify
brew --version
```

#### 2. Docker Not Running

**Symptom:**
```
Cannot connect to the Docker daemon
```

**Solution:**
```bash
# Open Docker Desktop
open -a Docker

# Wait for it to start, then verify
docker info
```

#### 3. Port Already in Use

**Symptom:**
```
Error: listen EADDRINUSE: address already in use :::9080
```

**Solution:**
```bash
# Find process using port
lsof -i :9080

# Kill the process
kill -9 <PID>

# Or change port in .env file
```

#### 4. Go Not Found After Installation

**Symptom:**
```
zsh: command not found: go
```

**Solution:**
```bash
# Reload shell configuration
source ~/.zshrc   # or ~/.bashrc

# Or add manually
export PATH=$PATH:/usr/local/go/bin
export GOPATH=$HOME/go
export PATH=$PATH:$GOPATH/bin

# Verify
go version
```

#### 5. Permission Denied Running Scripts

**Symptom:**
```
Permission denied: ./install-dependencies.sh
```

**Solution:**
```bash
chmod +x scripts/setup/OSX/*.sh
```

#### 6. Xcode Command Line Tools Installation Hangs

**Solution:**
1. Cancel the dialog
2. Install manually:
   ```bash
   xcode-select --install
   ```
3. Or download from [Apple Developer](https://developer.apple.com/download/all/)

#### 7. npm Install Fails in web-ui

**Solution:**
```bash
cd web-ui
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

### Getting Help

If you encounter issues:

1. Check logs: `./scripts/setup/OSX/manage-services.sh logs`
2. Verify setup: `./scripts/setup/OSX/verify-setup.sh`
3. Check Docker status: `docker info`
4. Check service status: `docker compose ps`
5. Review documentation: `README.md`

## macOS Specific Notes

### Apple Silicon vs Intel

The scripts automatically detect your architecture:

- **Apple Silicon (arm64)**: Uses `/opt/homebrew` for Homebrew
- **Intel (x86_64)**: Uses `/usr/local` for Homebrew

Docker Desktop automatically handles architecture differences for containers.

### Security & Permissions

macOS may prompt for permissions when:
- Installing Homebrew
- Installing Docker Desktop
- Running Docker for the first time

These prompts are normal and required for the software to function.

### Firewall

If you have macOS Firewall enabled, you may need to allow:
- Docker
- Node.js
- Go services

Go to **System Preferences > Security & Privacy > Firewall > Firewall Options** to allow applications.

### Energy Settings

For long-running development:
- Disable sleep when running Docker
- Or adjust in **System Preferences > Energy Saver**

### Recommended Development Tools

While not required, these tools enhance the development experience:

```bash
# Visual Studio Code
brew install --cask visual-studio-code

# iTerm2 (better terminal)
brew install --cask iterm2

# PostgreSQL client
brew install postgresql

# HTTP client
brew install httpie
```

## Service URLs

After setup, access these URLs:

| Service | URL |
|---------|-----|
| Web UI | http://localhost:6173 |
| Integration API | http://localhost:9080 |
| Design API | http://localhost:9081 |
| Capability API | http://localhost:9082 |
| Auth API | http://localhost:9083 |

### Health Endpoints

- http://localhost:9080/health
- http://localhost:9081/health
- http://localhost:9082/health
- http://localhost:9083/health

## Additional Resources

- [Main README](../../../README.md)
- [Development Guide](../../../DEVELOPMENT_GUIDE.md)
- [API Documentation](../../../docs/api/)
- [Docker Documentation](https://docs.docker.com/)
- [Go Documentation](https://golang.org/doc/)
- [Homebrew Documentation](https://docs.brew.sh/)

## Support

For issues and questions:
- GitHub Issues: https://github.com/jareynolds/intentr/issues
- Project Documentation: See README.md

---

**Last Updated**: 2025-01-14
**Version**: 1.0.0
