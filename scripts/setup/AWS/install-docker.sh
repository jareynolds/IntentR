#!/bin/bash

################################################################################
# Docker Installation Script for AWS EC2 Linux
################################################################################
# This script installs Docker and Docker Compose on AWS EC2 Linux instances
# Supports: Amazon Linux 2, Ubuntu, Debian, RHEL, CentOS
#
# Usage:
#   sudo ./install-docker.sh
################################################################################

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

DOCKER_COMPOSE_VERSION="2.24.5"

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

# Install Docker
log "Installing Docker..."

if command -v docker &> /dev/null; then
    warn "Docker is already installed: $(docker --version)"
else
    if [ "$OS" = "amzn" ]; then
        # Amazon Linux 2
        yum install -y docker
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

# Install Docker Compose
log "Installing Docker Compose..."

if docker compose version &> /dev/null || command -v docker-compose &> /dev/null; then
    warn "Docker Compose is already installed"
else
    DOCKER_CONFIG=${DOCKER_CONFIG:-$HOME/.docker}
    mkdir -p $DOCKER_CONFIG/cli-plugins

    curl -SL "https://github.com/docker/compose/releases/download/v${DOCKER_COMPOSE_VERSION}/docker-compose-linux-x86_64" \
        -o $DOCKER_CONFIG/cli-plugins/docker-compose

    chmod +x $DOCKER_CONFIG/cli-plugins/docker-compose
    ln -sf $DOCKER_CONFIG/cli-plugins/docker-compose /usr/local/bin/docker-compose || true

    log "Docker Compose installed successfully"
fi

# Configure Docker permissions
log "Configuring Docker permissions..."

for user in ec2-user ubuntu $SUDO_USER; do
    if id "$user" &>/dev/null; then
        usermod -aG docker "$user" || true
        log "Added user '$user' to docker group"
    fi
done

# Verify installation
log "Verifying installation..."
docker --version
docker compose version || docker-compose --version

log "Docker installation complete!"
log "Note: Users may need to log out and back in for group membership to take effect"
