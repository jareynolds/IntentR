#!/bin/bash

################################################################################
# System Dependencies Installation Script
################################################################################
# This script installs system dependencies required for UbeCode microservices
#
# Usage:
#   sudo ./install-dependencies.sh
################################################################################

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

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

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    error "This script must be run as root. Use: sudo $0"
fi

# Detect Linux distribution
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
    log "Detected OS: $OS"
else
    error "Cannot detect Linux distribution"
fi

# Update system packages
log "Updating system packages..."

if [ "$OS" = "amzn" ] || [ "$OS" = "rhel" ] || [ "$OS" = "centos" ]; then
    yum update -y
elif [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
    apt-get update -y
    apt-get upgrade -y
else
    error "Unsupported distribution: $OS"
fi

log "System packages updated successfully"

# Install dependencies
log "Installing system dependencies..."

if [ "$OS" = "amzn" ] || [ "$OS" = "rhel" ] || [ "$OS" = "centos" ]; then
    yum install -y \
        git \
        wget \
        curl \
        tar \
        gzip \
        make \
        gcc \
        openssl \
        ca-certificates \
        vim \
        nano \
        htop \
        net-tools \
        bind-utils
elif [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
    apt-get install -y \
        git \
        wget \
        curl \
        tar \
        gzip \
        make \
        gcc \
        openssl \
        ca-certificates \
        apt-transport-https \
        software-properties-common \
        vim \
        nano \
        htop \
        net-tools \
        dnsutils
fi

log "System dependencies installed successfully"

# Verify installations
log "Verifying installations..."

declare -a commands=("git" "wget" "curl" "make" "gcc")

for cmd in "${commands[@]}"; do
    if command -v $cmd &> /dev/null; then
        log "✓ $cmd: $(command -v $cmd)"
    else
        warn "✗ $cmd not found"
    fi
done

log "Dependency installation complete!"
