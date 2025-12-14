#!/bin/bash

################################################################################
# Docker Desktop Installation Script for macOS
################################################################################
# This script helps install Docker Desktop on macOS
#
# Prerequisites:
#   - macOS 11 (Big Sur) or later
#   - Homebrew (installed by install-dependencies.sh)
#
# Usage:
#   ./2-install-docker.sh [--force]
#
# Options:
#   --force    Reinstall Docker even if already installed
#
# Sequence: Run scripts in numerical order (Step 2 of 5)
#   1-install-dependencies.sh   (completed)
#   2-install-docker.sh         <-- YOU ARE HERE
#   3-install-golang.sh
#   4-configure-environment.sh
#   5-verify-setup.sh
#
# IDEMPOTENT: If Docker is already installed, it will be skipped and
#             the script will continue. If Docker is installed but not
#             running, it will attempt to start it.
#             Use --force to reinstall anyway.
################################################################################

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Parse arguments
FORCE_REINSTALL=false
for arg in "$@"; do
    case $arg in
        --force)
            FORCE_REINSTALL=true
            shift
            ;;
    esac
done

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Check if running on macOS
check_macos() {
    if [[ "$(uname)" != "Darwin" ]]; then
        error "This script is designed for macOS only"
    fi
}

# Check for Homebrew
check_homebrew() {
    if ! command -v brew &> /dev/null; then
        error "Homebrew is not installed. Please run 1-install-dependencies.sh first."
    fi
}

# Detect chip architecture
detect_architecture() {
    ARCH=$(uname -m)
    if [[ "$ARCH" == "arm64" ]]; then
        log "Detected Apple Silicon (arm64)"
        DOCKER_ARCH="arm64"
    else
        log "Detected Intel (x86_64)"
        DOCKER_ARCH="amd64"
    fi
}

# Check if Docker is already installed
check_docker_installed() {
    if command -v docker &> /dev/null && [ "$FORCE_REINSTALL" = false ]; then
        DOCKER_VERSION=$(docker --version 2>/dev/null || echo "unknown")
        log "Docker already installed: $DOCKER_VERSION - skipping installation"

        # Check if Docker is running
        if docker info &> /dev/null; then
            log "Docker daemon is running - continuing..."
            return 0
        else
            warn "Docker is installed but not running - will attempt to start it"
            return 1
        fi
    fi
    if [ "$FORCE_REINSTALL" = true ] && command -v docker &> /dev/null; then
        warn "Force reinstall requested for Docker"
    fi
    return 2
}

# Install Docker Desktop via Homebrew Cask
install_docker_homebrew() {
    log "Installing Docker Desktop via Homebrew..."

    if brew list --cask docker &> /dev/null; then
        warn "Docker Desktop is already installed via Homebrew"
    else
        brew install --cask docker
        log "Docker Desktop installed successfully"
    fi
}

# Alternative: Provide manual download instructions
show_manual_install() {
    echo ""
    info "If Homebrew installation fails, you can install Docker Desktop manually:"
    echo ""
    echo "  1. Download Docker Desktop from:"
    if [[ "$DOCKER_ARCH" == "arm64" ]]; then
        echo "     https://desktop.docker.com/mac/main/arm64/Docker.dmg"
    else
        echo "     https://desktop.docker.com/mac/main/amd64/Docker.dmg"
    fi
    echo ""
    echo "  2. Open the downloaded .dmg file"
    echo "  3. Drag Docker to the Applications folder"
    echo "  4. Open Docker from Applications"
    echo "  5. Complete the setup wizard"
    echo ""
}

# Start Docker Desktop
start_docker() {
    log "Starting Docker Desktop..."

    # Check if Docker app exists
    if [[ -d "/Applications/Docker.app" ]]; then
        open -a Docker
        log "Docker Desktop is starting..."

        # Wait for Docker to be ready
        info "Waiting for Docker to initialize (this may take a minute)..."
        local max_attempts=30
        local attempt=1

        while [ $attempt -le $max_attempts ]; do
            if docker info &> /dev/null; then
                log "Docker is now running!"
                return 0
            fi
            echo -n "."
            sleep 2
            attempt=$((attempt + 1))
        done

        echo ""
        warn "Docker is taking longer than expected to start"
        info "Please wait for Docker Desktop to fully initialize, then re-run verify-setup.sh"
    else
        warn "Docker Desktop not found in Applications"
        show_manual_install
    fi
}

# Verify Docker installation
verify_docker() {
    log "Verifying Docker installation..."

    if docker --version &> /dev/null; then
        echo -e "  ${GREEN}✓${NC} Docker CLI: $(docker --version)"
    else
        echo -e "  ${RED}✗${NC} Docker CLI not found"
        return 1
    fi

    if docker compose version &> /dev/null; then
        echo -e "  ${GREEN}✓${NC} Docker Compose: $(docker compose version --short)"
    else
        echo -e "  ${RED}✗${NC} Docker Compose not found"
        return 1
    fi

    if docker info &> /dev/null; then
        echo -e "  ${GREEN}✓${NC} Docker daemon is running"
    else
        echo -e "  ${YELLOW}⚠${NC} Docker daemon is not running"
        info "Start Docker Desktop from Applications"
    fi

    return 0
}

# Display next steps
show_next_steps() {
    echo ""
    log "=================================================="
    log "  Docker Installation Complete!"
    log "=================================================="
    echo ""
    info "Important: Make sure Docker Desktop is running before proceeding."
    echo ""
    info "Next step (3 of 5):"
    echo ""
    echo "  Run the Go installation script:"
    echo "    ./3-install-golang.sh"
    echo ""
}

################################################################################
# Main Execution
################################################################################

main() {
    log "Starting Docker Desktop installation for macOS..."
    if [ "$FORCE_REINSTALL" = true ]; then
        warn "Force mode enabled - will reinstall Docker"
    fi
    echo ""

    check_macos
    check_homebrew
    detect_architecture

    # Check current Docker status
    check_docker_installed
    local docker_status=$?

    if [[ $docker_status -eq 2 ]]; then
        # Docker not installed at all
        install_docker_homebrew
        start_docker
    elif [[ $docker_status -eq 1 ]]; then
        # Docker installed but not running
        start_docker
    fi

    verify_docker
    show_next_steps
}

main "$@"
