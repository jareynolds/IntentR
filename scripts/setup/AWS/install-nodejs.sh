#!/bin/bash

################################################################################
# Node.js Installation Script for AWS EC2 Linux
################################################################################
# This script installs Node.js 22.x (LTS) required for Vite 7.x and the
# IntentR web-ui frontend.
#
# Supports: Amazon Linux 2023, Amazon Linux 2, Ubuntu, Debian, RHEL, CentOS
#
# Vite 7.x requires Node.js 20.19+ or 22.12+
#
# Usage:
#   sudo ./install-nodejs.sh [version]
#
# Examples:
#   sudo ./install-nodejs.sh          # Installs Node.js 22.x (default)
#   sudo ./install-nodejs.sh 20       # Installs Node.js 20.x
#   sudo ./install-nodejs.sh 22       # Installs Node.js 22.x
#
# Created: 2025-12-30
################################################################################

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Default Node.js major version
NODE_MAJOR_VERSION="${1:-22}"

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

# Check if running as root
check_root() {
    if [ "$EUID" -ne 0 ]; then
        error "This script must be run as root. Use: sudo $0"
    fi
}

# Detect Linux distribution
detect_distribution() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
        VER=$VERSION_ID
        log "Detected OS: $OS $VER"
    else
        error "Cannot detect Linux distribution"
    fi
}

# Check current Node.js version
check_current_version() {
    if command -v node &> /dev/null; then
        CURRENT_VERSION=$(node --version)
        CURRENT_MAJOR=$(echo "$CURRENT_VERSION" | sed 's/v//' | cut -d. -f1)
        info "Current Node.js version: $CURRENT_VERSION (major: $CURRENT_MAJOR)"

        # Check if version meets Vite requirements
        if [ "$CURRENT_MAJOR" -ge 20 ]; then
            MINOR=$(echo "$CURRENT_VERSION" | sed 's/v//' | cut -d. -f2)
            if [ "$CURRENT_MAJOR" -eq 20 ] && [ "$MINOR" -ge 19 ]; then
                info "Current version meets Vite 7.x requirements (>=20.19)"
                return 0
            elif [ "$CURRENT_MAJOR" -ge 22 ]; then
                info "Current version meets Vite 7.x requirements (>=22.x)"
                return 0
            fi
        fi
        warn "Current version does not meet Vite 7.x requirements (need >=20.19 or >=22.12)"
        return 1
    else
        info "Node.js is not installed"
        return 1
    fi
}

# Remove existing Node.js (Amazon Linux specific)
remove_existing_nodejs_amzn() {
    log "Checking for existing Node.js installation..."

    if rpm -q nodejs &>/dev/null; then
        log "Removing existing Node.js packages..."
        dnf remove -y nodejs nodejs-full-i18n nodejs-npm nodejs-docs nodejs-libs 2>/dev/null || \
        yum remove -y nodejs nodejs-full-i18n nodejs-npm nodejs-docs nodejs-libs 2>/dev/null || true
        log "Existing Node.js removed"
    fi
}

# Install Node.js on Amazon Linux
install_nodejs_amzn() {
    log "Setting up NodeSource repository for Node.js ${NODE_MAJOR_VERSION}.x..."

    # Add NodeSource repository
    curl -fsSL "https://rpm.nodesource.com/setup_${NODE_MAJOR_VERSION}.x" | bash -

    # Remove existing conflicting packages
    remove_existing_nodejs_amzn

    # Install Node.js
    log "Installing Node.js ${NODE_MAJOR_VERSION}.x..."
    dnf install -y nodejs 2>/dev/null || yum install -y nodejs 2>/dev/null

    log "Node.js installed successfully"
}

# Install Node.js on Ubuntu/Debian
install_nodejs_debian() {
    log "Setting up NodeSource repository for Node.js ${NODE_MAJOR_VERSION}.x..."

    # Install prerequisites
    apt-get update
    apt-get install -y ca-certificates curl gnupg

    # Add NodeSource repository
    mkdir -p /etc/apt/keyrings
    curl -fsSL "https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key" | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg

    echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_${NODE_MAJOR_VERSION}.x nodistro main" > /etc/apt/sources.list.d/nodesource.list

    # Install Node.js
    log "Installing Node.js ${NODE_MAJOR_VERSION}.x..."
    apt-get update
    apt-get install -y nodejs

    log "Node.js installed successfully"
}

# Install Node.js on RHEL/CentOS
install_nodejs_rhel() {
    log "Setting up NodeSource repository for Node.js ${NODE_MAJOR_VERSION}.x..."

    # Add NodeSource repository
    curl -fsSL "https://rpm.nodesource.com/setup_${NODE_MAJOR_VERSION}.x" | bash -

    # Install Node.js
    log "Installing Node.js ${NODE_MAJOR_VERSION}.x..."
    yum install -y nodejs

    log "Node.js installed successfully"
}

# Main installation function
install_nodejs() {
    log "Installing Node.js ${NODE_MAJOR_VERSION}.x..."

    case $OS in
        amzn)
            install_nodejs_amzn
            ;;
        ubuntu|debian)
            install_nodejs_debian
            ;;
        rhel|centos)
            install_nodejs_rhel
            ;;
        *)
            error "Unsupported distribution: $OS"
            ;;
    esac
}

# Verify installation
verify_installation() {
    log "Verifying installation..."

    echo ""
    if command -v node &> /dev/null; then
        info "Node.js version: $(node --version)"
    else
        error "Node.js installation failed - command not found"
    fi

    if command -v npm &> /dev/null; then
        info "npm version: $(npm --version)"
    else
        error "npm installation failed - command not found"
    fi

    # Check Vite compatibility
    INSTALLED_VERSION=$(node --version | sed 's/v//')
    MAJOR=$(echo "$INSTALLED_VERSION" | cut -d. -f1)
    MINOR=$(echo "$INSTALLED_VERSION" | cut -d. -f2)

    echo ""
    if [ "$MAJOR" -ge 22 ]; then
        log "Node.js $INSTALLED_VERSION is compatible with Vite 7.x"
    elif [ "$MAJOR" -eq 20 ] && [ "$MINOR" -ge 19 ]; then
        log "Node.js $INSTALLED_VERSION is compatible with Vite 7.x"
    else
        warn "Node.js $INSTALLED_VERSION may not be compatible with Vite 7.x"
        warn "Vite 7.x requires Node.js >=20.19 or >=22.12"
    fi
}

# Display summary
display_summary() {
    echo ""
    log "=============================================="
    log "  Node.js Installation Complete!"
    log "=============================================="
    echo ""
    info "Installed versions:"
    echo "  Node.js: $(node --version)"
    echo "  npm: $(npm --version)"
    echo ""
    info "Vite 7.x compatibility: Requires Node.js >=20.19 or >=22.12"
    echo ""
}

################################################################################
# Main Execution
################################################################################

main() {
    log "Starting Node.js Installation"
    log "=============================="

    check_root
    detect_distribution

    # Check if upgrade is needed
    if check_current_version; then
        read -p "Node.js already meets requirements. Reinstall anyway? (y/N): " CONFIRM
        if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
            log "Keeping existing installation"
            exit 0
        fi
    fi

    install_nodejs
    verify_installation
    display_summary

    log "Node.js installation completed successfully!"
}

main "$@"
