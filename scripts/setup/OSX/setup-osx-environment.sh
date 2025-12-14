#!/bin/bash

################################################################################
# UbeCode Microservices Environment Setup Script for macOS
################################################################################
# This is the MAIN setup script that runs all installation steps in sequence.
#
# What this script does:
#   1. Installs Xcode Command Line Tools (if needed)
#   2. Installs Homebrew (if needed)
#   3. Installs system dependencies (git, wget, curl, etc.)
#   4. Installs Node.js and npm
#   5. Installs Docker Desktop
#   6. Installs Go 1.24+
#   7. Configures environment variables
#   8. Validates the installation
#
# Usage:
#   ./setup-osx-environment.sh
#
# Note: This script does NOT require sudo for most operations.
#       Docker Desktop requires admin privileges during installation.
#
# IDEMPOTENT: This script is safe to run multiple times. If a component
#             is already installed, it will be skipped and the script
#             will continue to the next step.
#
# Estimated time: 10-15 minutes (depending on download speeds)
################################################################################

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
GO_VERSION="1.24.0"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
LOG_FILE="$PROJECT_ROOT/logs/osx-setup.log"

################################################################################
# Helper Functions
################################################################################

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

step() {
    echo -e "\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}  STEP $1: $2${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

# Create log directory
setup_logging() {
    mkdir -p "$(dirname "$LOG_FILE")"
    echo "=== UbeCode macOS Setup Log ===" > "$LOG_FILE"
    echo "Started: $(date)" >> "$LOG_FILE"
    echo "" >> "$LOG_FILE"
}

# Check if running on macOS
check_macos() {
    if [[ "$(uname)" != "Darwin" ]]; then
        error "This script is designed for macOS only"
    fi

    MACOS_VERSION=$(sw_vers -productVersion)
    ARCH=$(uname -m)
    log "Detected macOS $MACOS_VERSION on $ARCH"
}

################################################################################
# Installation Functions
################################################################################

# Install Xcode Command Line Tools
install_xcode_cli() {
    step "1" "Xcode Command Line Tools"

    if xcode-select -p &> /dev/null; then
        log "Xcode Command Line Tools are already installed - skipping, continuing..."
    else
        log "Installing Xcode Command Line Tools..."
        info "A dialog will appear - please click 'Install' to proceed"
        xcode-select --install 2>/dev/null || true

        echo ""
        read -p "Press Enter after the Xcode installation completes..." -r
        echo ""

        if ! xcode-select -p &> /dev/null; then
            error "Xcode Command Line Tools installation failed"
        fi
        log "Xcode Command Line Tools installed successfully"
    fi
}

# Install Homebrew
install_homebrew() {
    step "2" "Homebrew Package Manager"

    if command -v brew &> /dev/null; then
        log "Homebrew is already installed - skipping installation, continuing..."
        log "Updating Homebrew..."
        brew update >> "$LOG_FILE" 2>&1 || warn "Homebrew update failed, continuing anyway..."
    else
        log "Installing Homebrew..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

        # Add Homebrew to PATH for Apple Silicon
        if [[ "$ARCH" == "arm64" ]]; then
            echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
            eval "$(/opt/homebrew/bin/brew shellenv)"
        fi

        log "Homebrew installed successfully"
    fi
}

# Install system dependencies
install_dependencies() {
    step "3" "System Dependencies"

    log "Installing system dependencies via Homebrew..."

    local packages=("git" "wget" "curl" "make" "openssl" "jq")

    for pkg in "${packages[@]}"; do
        if brew list "$pkg" &> /dev/null; then
            log "  $pkg: already installed"
        else
            log "  Installing $pkg..."
            brew install "$pkg" >> "$LOG_FILE" 2>&1 || warn "Failed to install $pkg"
        fi
    done

    log "System dependencies installed"
}

# Install Node.js
install_nodejs() {
    step "4" "Node.js"

    if command -v node &> /dev/null; then
        log "Node.js is already installed: $(node --version) - skipping, continuing..."
    else
        log "Installing Node.js via Homebrew..."
        brew install node >> "$LOG_FILE" 2>&1
        log "Node.js installed: $(node --version)"
    fi

    if command -v npm &> /dev/null; then
        log "npm is available: v$(npm --version)"
    fi
}

# Install Docker Desktop
install_docker() {
    step "5" "Docker Desktop"

    if command -v docker &> /dev/null; then
        log "Docker is already installed: $(docker --version) - skipping installation, continuing..."

        if docker info &> /dev/null; then
            log "Docker daemon is running"
        else
            warn "Docker is installed but not running"
            info "Starting Docker Desktop..."
            open -a Docker 2>/dev/null || true

            # Wait for Docker
            log "Waiting for Docker to start..."
            local attempts=0
            while [ $attempts -lt 30 ]; do
                if docker info &> /dev/null; then
                    log "Docker is now running"
                    break
                fi
                sleep 2
                attempts=$((attempts + 1))
                echo -n "."
            done
            echo ""
        fi
    else
        log "Installing Docker Desktop via Homebrew..."
        brew install --cask docker >> "$LOG_FILE" 2>&1

        log "Docker Desktop installed"
        info "Starting Docker Desktop..."
        open -a Docker

        # Wait for Docker
        log "Waiting for Docker to initialize (this may take a minute)..."
        local attempts=0
        while [ $attempts -lt 60 ]; do
            if docker info &> /dev/null; then
                log "Docker is now running"
                break
            fi
            sleep 2
            attempts=$((attempts + 1))
            echo -n "."
        done
        echo ""

        if ! docker info &> /dev/null; then
            warn "Docker is taking longer than expected to start"
            info "Please wait for Docker Desktop to fully initialize"
        fi
    fi
}

# Install Go
install_go() {
    step "6" "Go Programming Language"

    if command -v go &> /dev/null; then
        local current_version=$(go version | awk '{print $3}' | sed 's/go//')
        log "Go is already installed: go$current_version"

        # Check if version is sufficient
        local major=$(echo "$current_version" | cut -d. -f1)
        local minor=$(echo "$current_version" | cut -d. -f2)
        if [[ "$major" -ge 1 ]] && [[ "$minor" -ge 24 ]]; then
            log "Go version meets requirements (>= 1.24)"
        else
            log "Upgrading Go to latest version..."
            brew upgrade go >> "$LOG_FILE" 2>&1 || log "Go is at latest Homebrew version"
        fi
    else
        log "Installing Go via Homebrew..."
        brew install go >> "$LOG_FILE" 2>&1
        log "Go installed: $(go version)"
    fi

    # Configure Go environment
    log "Configuring Go environment..."
    local shell_config="$HOME/.zshrc"
    if [[ ! -f "$shell_config" ]]; then
        shell_config="$HOME/.bashrc"
    fi

    if ! grep -q "GOPATH" "$shell_config" 2>/dev/null; then
        cat >> "$shell_config" << 'EOF'

# Go Programming Language
export GOPATH=$HOME/go
export PATH=$PATH:$GOPATH/bin
EOF
        log "Added Go environment to $shell_config"
    fi

    export GOPATH=$HOME/go
    export PATH=$PATH:$GOPATH/bin
    mkdir -p "$GOPATH"/{bin,src,pkg}

    log "Go environment configured"
}

# Configure environment
configure_environment() {
    step "7" "Environment Configuration"

    if [ -f "$PROJECT_ROOT/.env" ]; then
        log "Environment file already exists - skipping configuration, continuing..."
        info "To reconfigure, run: ./4-configure-environment.sh"
    else
        log "Running environment configuration..."
        "$SCRIPT_DIR/4-configure-environment.sh"
    fi
}

# Install web UI dependencies
install_web_dependencies() {
    step "8" "Web UI Dependencies"

    if [ -d "$PROJECT_ROOT/web-ui" ]; then
        cd "$PROJECT_ROOT/web-ui"

        if [ -d "node_modules" ]; then
            log "Web UI dependencies already installed - skipping, continuing..."
        else
            log "Installing web UI dependencies..."
            npm install >> "$LOG_FILE" 2>&1
            log "Web UI dependencies installed"
        fi

        cd "$PROJECT_ROOT"
    else
        warn "Web UI directory not found"
    fi
}

# Validate installation
validate_installation() {
    step "9" "Validation"

    log "Validating installation..."

    local failed=0

    # Check each component
    if command -v git &> /dev/null; then
        info "✓ Git: $(git --version)"
    else
        error "✗ Git not found"
        failed=1
    fi

    if command -v docker &> /dev/null; then
        info "✓ Docker: $(docker --version)"
    else
        error "✗ Docker not found"
        failed=1
    fi

    if docker compose version &> /dev/null; then
        info "✓ Docker Compose: $(docker compose version --short)"
    else
        error "✗ Docker Compose not found"
        failed=1
    fi

    if command -v go &> /dev/null; then
        info "✓ Go: $(go version | awk '{print $3}')"
    else
        error "✗ Go not found"
        failed=1
    fi

    if command -v node &> /dev/null; then
        info "✓ Node.js: $(node --version)"
    else
        error "✗ Node.js not found"
        failed=1
    fi

    if command -v npm &> /dev/null; then
        info "✓ npm: v$(npm --version)"
    else
        error "✗ npm not found"
        failed=1
    fi

    if [ $failed -eq 1 ]; then
        error "Installation validation failed"
    else
        log "All components validated successfully!"
    fi
}

# Display completion message
display_completion() {
    echo ""
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}  UbeCode macOS Setup Complete!${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    info "Next steps:"
    echo ""
    echo "  1. Verify the setup:"
    echo "     ./5-verify-setup.sh"
    echo ""
    echo "  2. Start all services:"
    echo "     cd $PROJECT_ROOT"
    echo "     ./start.sh"
    echo ""
    echo "  3. Or start manually:"
    echo "     make docker-build"
    echo "     make docker-up"
    echo "     cd web-ui && npm run dev"
    echo ""
    echo "  4. Access the application:"
    echo "     Web UI:      http://localhost:6173"
    echo "     API Health:  http://localhost:9080/health"
    echo ""
    info "For more information, see:"
    echo "     - README.md"
    echo "     - scripts/setup/OSX/README-SETUP.md"
    echo ""
    log "Setup log saved to: $LOG_FILE"
    echo ""
}

################################################################################
# Main Execution
################################################################################

main() {
    clear
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}  UbeCode Microservices Environment Setup for macOS${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    setup_logging
    check_macos

    echo ""
    info "This script will install the following:"
    echo "  - Xcode Command Line Tools"
    echo "  - Homebrew"
    echo "  - System dependencies (git, wget, curl, etc.)"
    echo "  - Node.js and npm"
    echo "  - Docker Desktop"
    echo "  - Go ${GO_VERSION}+"
    echo ""
    read -p "Continue with installation? (Y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Nn]$ ]]; then
        log "Installation cancelled"
        exit 0
    fi

    install_xcode_cli
    install_homebrew
    install_dependencies
    install_nodejs
    install_docker
    install_go
    configure_environment
    install_web_dependencies
    validate_installation
    display_completion

    log "Setup completed successfully!"
}

# Run main function
main "$@"
