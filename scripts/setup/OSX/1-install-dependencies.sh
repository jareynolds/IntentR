#!/bin/bash

################################################################################
# System Dependencies Installation Script for macOS
################################################################################
# This script installs system dependencies required for UbeCode microservices
#
# Prerequisites:
#   - macOS 11 (Big Sur) or later
#   - Xcode Command Line Tools (will be installed if missing)
#
# Usage:
#   ./1-install-dependencies.sh [--force]
#
# Options:
#   --force    Reinstall components even if already installed
#
# Sequence: Run scripts in numerical order (Step 1 of 5)
#   1-install-dependencies.sh   <-- YOU ARE HERE
#   2-install-docker.sh
#   3-install-golang.sh
#   4-configure-environment.sh
#   5-verify-setup.sh
#
# IDEMPOTENT: If a component is already installed, it will be skipped and
#             the script will continue to the next component.
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

    # Get macOS version
    MACOS_VERSION=$(sw_vers -productVersion)
    log "Detected macOS version: $MACOS_VERSION"
}

# Install Xcode Command Line Tools
install_xcode_cli() {
    log "Checking Xcode Command Line Tools..."

    if xcode-select -p &> /dev/null && [ "$FORCE_REINSTALL" = false ]; then
        log "Xcode Command Line Tools already installed - skipping, continuing..."
    else
        log "Installing Xcode Command Line Tools..."
        info "A dialog may appear - please click 'Install' to proceed"
        xcode-select --install 2>/dev/null || true

        # Wait for installation to complete
        echo "Waiting for Xcode Command Line Tools installation..."
        echo "Press Enter after the installation completes..."
        read -r

        if ! xcode-select -p &> /dev/null; then
            error "Xcode Command Line Tools installation failed. Please install manually."
        fi
        log "Xcode Command Line Tools installed successfully"
    fi
}

# Install Homebrew
install_homebrew() {
    log "Checking Homebrew..."

    if command -v brew &> /dev/null && [ "$FORCE_REINSTALL" = false ]; then
        log "Homebrew already installed: $(brew --version | head -1) - skipping install, continuing..."
        log "Updating Homebrew..."
        brew update || warn "Homebrew update failed, continuing anyway..."
    else
        log "Installing Homebrew..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

        # Add Homebrew to PATH for Apple Silicon Macs
        if [[ $(uname -m) == 'arm64' ]]; then
            echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
            eval "$(/opt/homebrew/bin/brew shellenv)"
        fi

        log "Homebrew installed successfully"
    fi
}

# Install system dependencies via Homebrew
install_dependencies() {
    log "Installing system dependencies..."

    local packages=(
        "git"
        "wget"
        "curl"
        "make"
        "openssl"
        "jq"
    )

    for pkg in "${packages[@]}"; do
        if brew list "$pkg" &> /dev/null && [ "$FORCE_REINSTALL" = false ]; then
            log "  $pkg already installed - skipping"
        else
            log "  Installing $pkg..."
            brew install "$pkg" || warn "Failed to install $pkg"
        fi
    done

    log "System dependencies installed successfully"
}

# Install Node.js (required for web-ui)
install_nodejs() {
    log "Checking Node.js..."

    if command -v node &> /dev/null && [ "$FORCE_REINSTALL" = false ]; then
        NODE_VERSION=$(node --version)
        log "Node.js already installed: $NODE_VERSION - skipping, continuing..."
    else
        log "Installing Node.js via Homebrew..."
        brew install node
        log "Node.js installed successfully: $(node --version)"
    fi

    # Verify npm
    if command -v npm &> /dev/null; then
        log "npm is available: $(npm --version)"
    else
        warn "npm not found, you may need to reinstall Node.js"
    fi
}

# Verify installations
verify_installations() {
    log "Verifying installations..."

    local commands=("git" "wget" "curl" "make" "node" "npm")
    local all_good=true

    for cmd in "${commands[@]}"; do
        if command -v "$cmd" &> /dev/null; then
            echo -e "  ${GREEN}✓${NC} $cmd: $(command -v $cmd)"
        else
            echo -e "  ${RED}✗${NC} $cmd not found"
            all_good=false
        fi
    done

    if [ "$all_good" = true ]; then
        log "All dependencies verified successfully!"
    else
        warn "Some dependencies are missing. Please check the output above."
    fi
}

# Display next steps
show_next_steps() {
    echo ""
    log "=================================================="
    log "  Dependencies Installation Complete!"
    log "=================================================="
    echo ""
    info "Next step (2 of 5):"
    echo ""
    echo "  Run the Docker installation script:"
    echo "    ./2-install-docker.sh"
    echo ""
}

################################################################################
# Main Execution
################################################################################

main() {
    log "Starting macOS dependency installation..."
    if [ "$FORCE_REINSTALL" = true ]; then
        warn "Force mode enabled - will reinstall all components"
    fi
    echo ""

    check_macos
    install_xcode_cli
    install_homebrew
    install_dependencies
    install_nodejs
    verify_installations
    show_next_steps
}

main "$@"
