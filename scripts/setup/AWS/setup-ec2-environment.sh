#!/bin/bash

################################################################################
# IntentR Microservices Environment Setup Script for AWS EC2 Linux
################################################################################
# This script sets up the complete environment for running IntentR microservices
# on an AWS EC2 Linux instance.
#
# Usage:
#   sudo ./setup-ec2-environment.sh [options]
#
# Options:
#   --skip-storage    Skip storage/EBS volume setup
#   --skip-docker     Skip Docker installation
#   --skip-node       Skip Node.js installation
#   --skip-go         Skip Go installation
#   --skip-nginx      Skip nginx configuration
#
# What this script does:
#   1. Detects Linux distribution and architecture (amd64/arm64)
#   2. Installs system dependencies
#   3. Configures additional EBS storage (if available)
#   4. Installs Docker, Docker Compose, and Docker Buildx
#   5. Installs Go 1.24+
#   6. Installs Node.js 22.x (required for Vite 7.x)
#   7. Configures user permissions for Docker
#   8. Configures nginx reverse proxy for external access
#   9. Validates the installation
#
# Supported:
#   - Amazon Linux 2023, Amazon Linux 2
#   - Ubuntu 20.04/22.04/24.04
#   - Debian 10/11/12
#   - RHEL 8/9
#   - CentOS 8/9
#   - amd64 (x86_64) and arm64 (aarch64) architectures
#
# Updates (2025-12-30):
#   - Added arm64 architecture support
#   - Added Node.js 22.x installation (required for Vite 7.x)
#   - Added Docker Buildx 0.17+ installation
#   - Added EBS storage setup for Docker data
#   - Updated Go to 1.24.x
#   - Added nginx reverse proxy configuration for external access
#   - Fixed nginx routing for auth service (/api/auth/, /api/users)
#   - Added comprehensive routing for all integration service endpoints
################################################################################

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
GO_VERSION="1.24.0"
NODE_MAJOR_VERSION="22"
DOCKER_COMPOSE_VERSION="2.32.0"
DOCKER_BUILDX_VERSION="0.19.3"
PROJECT_DIR="/opt/intentr"
LOG_FILE="/var/log/intentr-setup.log"

# Skip flags
SKIP_STORAGE=false
SKIP_DOCKER=false
SKIP_NODE=false
SKIP_GO=false
SKIP_NGINX=false

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

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-storage)
                SKIP_STORAGE=true
                shift
                ;;
            --skip-docker)
                SKIP_DOCKER=true
                shift
                ;;
            --skip-node)
                SKIP_NODE=true
                shift
                ;;
            --skip-go)
                SKIP_GO=true
                shift
                ;;
            --skip-nginx)
                SKIP_NGINX=true
                shift
                ;;
            -h|--help)
                echo "Usage: sudo $0 [options]"
                echo ""
                echo "Options:"
                echo "  --skip-storage    Skip storage/EBS volume setup"
                echo "  --skip-docker     Skip Docker installation"
                echo "  --skip-node       Skip Node.js installation"
                echo "  --skip-go         Skip Go installation"
                echo "  --skip-nginx      Skip nginx configuration"
                echo "  -h, --help        Show this help message"
                exit 0
                ;;
            *)
                warn "Unknown option: $1"
                shift
                ;;
        esac
    done
}

# Check if running as root
check_root() {
    if [ "$EUID" -ne 0 ]; then
        error "This script must be run as root. Use: sudo $0"
    fi
}

# Detect architecture
detect_architecture() {
    ARCH=$(uname -m)
    case $ARCH in
        x86_64)
            ARCH_SUFFIX="amd64"
            GO_ARCH="amd64"
            ;;
        aarch64|arm64)
            ARCH_SUFFIX="arm64"
            GO_ARCH="arm64"
            ;;
        *)
            error "Unsupported architecture: $ARCH"
            ;;
    esac
    log "Detected architecture: $ARCH ($ARCH_SUFFIX)"
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

################################################################################
# Installation Functions
################################################################################

# Update system packages
update_system() {
    log "Updating system packages..."

    if [ "$OS" = "amzn" ] || [ "$OS" = "rhel" ] || [ "$OS" = "centos" ]; then
        dnf update -y >> "$LOG_FILE" 2>&1 || yum update -y >> "$LOG_FILE" 2>&1
    elif [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
        apt-get update -y >> "$LOG_FILE" 2>&1
        apt-get upgrade -y >> "$LOG_FILE" 2>&1
    else
        error "Unsupported distribution: $OS"
    fi

    log "System packages updated successfully"
}

# Install basic dependencies
install_dependencies() {
    log "Installing basic dependencies..."

    if [ "$OS" = "amzn" ] || [ "$OS" = "rhel" ] || [ "$OS" = "centos" ]; then
        dnf install -y \
            git \
            wget \
            curl \
            tar \
            gzip \
            make \
            gcc \
            openssl \
            ca-certificates \
            rsync \
            >> "$LOG_FILE" 2>&1 || \
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
            rsync \
            >> "$LOG_FILE" 2>&1
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
            rsync \
            >> "$LOG_FILE" 2>&1
    fi

    log "Basic dependencies installed successfully"
}

# Setup additional storage (EBS volumes)
setup_storage() {
    if [ "$SKIP_STORAGE" = true ]; then
        info "Skipping storage setup (--skip-storage)"
        return 0
    fi

    log "Checking for additional storage volumes..."

    # Find unmounted disks
    UNMOUNTED_DISK=$(lsblk -dpno NAME,SIZE,TYPE | grep disk | while read name size type; do
        if ! lsblk -no MOUNTPOINT "$name" 2>/dev/null | grep -q .; then
            ROOT_DEV=$(df / | tail -1 | awk '{print $1}' | sed 's/[0-9]*$//' | sed 's/p[0-9]*$//')
            if [[ "$name" != "$ROOT_DEV"* ]]; then
                echo "$name"
                break
            fi
        fi
    done | head -1)

    if [ -n "$UNMOUNTED_DISK" ]; then
        log "Found unmounted disk: $UNMOUNTED_DISK"

        # Get size
        DISK_SIZE=$(lsblk -dno SIZE "$UNMOUNTED_DISK" 2>/dev/null)
        info "Disk size: $DISK_SIZE"

        # Check if it's large enough (at least 20GB)
        SIZE_GB=$(lsblk -bdno SIZE "$UNMOUNTED_DISK" 2>/dev/null)
        SIZE_GB=$((SIZE_GB / 1024 / 1024 / 1024))

        if [ "$SIZE_GB" -ge 20 ]; then
            log "Setting up $UNMOUNTED_DISK ($DISK_SIZE) for Docker storage..."

            # Check if already has filesystem
            if ! lsblk -no FSTYPE "$UNMOUNTED_DISK" 2>/dev/null | grep -q .; then
                log "Formatting $UNMOUNTED_DISK with XFS..."
                mkfs.xfs "$UNMOUNTED_DISK"
            else
                info "Disk already formatted"
            fi

            # Mount
            mkdir -p /data
            if ! mountpoint -q /data; then
                mount "$UNMOUNTED_DISK" /data
                log "Mounted $UNMOUNTED_DISK to /data"
            fi

            # Add to fstab
            UUID=$(blkid -s UUID -o value "$UNMOUNTED_DISK")
            if ! grep -q "$UUID" /etc/fstab; then
                echo "UUID=$UUID /data xfs defaults,nofail 0 2" >> /etc/fstab
                log "Added to /etc/fstab"
            fi

            # Configure Docker to use /data
            mkdir -p /data/docker
            mkdir -p /etc/docker
            echo '{"data-root": "/data/docker"}' > /etc/docker/daemon.json
            log "Docker configured to use /data/docker"
        else
            warn "Disk too small ($SIZE_GB GB). Need at least 20GB for Docker storage."
        fi
    else
        info "No additional storage volumes found. Docker will use root filesystem."
    fi
}

# Install Docker
install_docker() {
    if [ "$SKIP_DOCKER" = true ]; then
        info "Skipping Docker installation (--skip-docker)"
        return 0
    fi

    log "Installing Docker..."

    # Check if Docker is already installed
    if command -v docker &> /dev/null; then
        DOCKER_VERSION=$(docker --version)
        warn "Docker is already installed: $DOCKER_VERSION"
    else
        if [ "$OS" = "amzn" ]; then
            # Amazon Linux 2/2023
            dnf install -y docker >> "$LOG_FILE" 2>&1 || yum install -y docker >> "$LOG_FILE" 2>&1
            systemctl enable docker
            systemctl start docker
        elif [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
            # Ubuntu/Debian
            apt-get remove -y docker docker-engine docker.io containerd runc >> "$LOG_FILE" 2>&1 || true
            curl -fsSL https://get.docker.com -o get-docker.sh
            sh get-docker.sh >> "$LOG_FILE" 2>&1
            rm get-docker.sh
            systemctl enable docker
            systemctl start docker
        elif [ "$OS" = "rhel" ] || [ "$OS" = "centos" ]; then
            # RHEL/CentOS
            yum install -y yum-utils >> "$LOG_FILE" 2>&1
            yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo >> "$LOG_FILE" 2>&1
            yum install -y docker-ce docker-ce-cli containerd.io >> "$LOG_FILE" 2>&1
            systemctl enable docker
            systemctl start docker
        fi
        log "Docker installed successfully"
    fi
}

# Install Docker Compose
install_docker_compose() {
    if [ "$SKIP_DOCKER" = true ]; then
        return 0
    fi

    log "Installing Docker Compose v${DOCKER_COMPOSE_VERSION}..."

    DOCKER_CONFIG=${DOCKER_CONFIG:-$HOME/.docker}
    mkdir -p $DOCKER_CONFIG/cli-plugins

    # Determine architecture suffix for download
    if [ "$ARCH_SUFFIX" = "arm64" ]; then
        COMPOSE_ARCH="aarch64"
    else
        COMPOSE_ARCH="x86_64"
    fi

    curl -SL "https://github.com/docker/compose/releases/download/v${DOCKER_COMPOSE_VERSION}/docker-compose-linux-${COMPOSE_ARCH}" \
        -o $DOCKER_CONFIG/cli-plugins/docker-compose >> "$LOG_FILE" 2>&1

    chmod +x $DOCKER_CONFIG/cli-plugins/docker-compose

    # Also install for all users
    mkdir -p /usr/local/lib/docker/cli-plugins
    cp $DOCKER_CONFIG/cli-plugins/docker-compose /usr/local/lib/docker/cli-plugins/docker-compose

    ln -sf $DOCKER_CONFIG/cli-plugins/docker-compose /usr/local/bin/docker-compose || true

    log "Docker Compose installed successfully"
}

# Install Docker Buildx
install_docker_buildx() {
    if [ "$SKIP_DOCKER" = true ]; then
        return 0
    fi

    log "Installing Docker Buildx v${DOCKER_BUILDX_VERSION}..."

    DOCKER_CONFIG=${DOCKER_CONFIG:-$HOME/.docker}
    mkdir -p $DOCKER_CONFIG/cli-plugins

    curl -SL "https://github.com/docker/buildx/releases/download/v${DOCKER_BUILDX_VERSION}/buildx-v${DOCKER_BUILDX_VERSION}.linux-${ARCH_SUFFIX}" \
        -o $DOCKER_CONFIG/cli-plugins/docker-buildx >> "$LOG_FILE" 2>&1

    chmod +x $DOCKER_CONFIG/cli-plugins/docker-buildx

    # Also install for all users
    mkdir -p /usr/local/lib/docker/cli-plugins
    cp $DOCKER_CONFIG/cli-plugins/docker-buildx /usr/local/lib/docker/cli-plugins/docker-buildx

    # Install for ec2-user if exists
    if id "ec2-user" &>/dev/null; then
        USER_DOCKER_CONFIG="/home/ec2-user/.docker"
        mkdir -p "$USER_DOCKER_CONFIG/cli-plugins"
        cp $DOCKER_CONFIG/cli-plugins/docker-buildx "$USER_DOCKER_CONFIG/cli-plugins/docker-buildx"
        cp $DOCKER_CONFIG/cli-plugins/docker-compose "$USER_DOCKER_CONFIG/cli-plugins/docker-compose" 2>/dev/null || true
        chown -R ec2-user:ec2-user "$USER_DOCKER_CONFIG"
    fi

    log "Docker Buildx installed successfully"
}

# Install Go
install_go() {
    if [ "$SKIP_GO" = true ]; then
        info "Skipping Go installation (--skip-go)"
        return 0
    fi

    log "Installing Go ${GO_VERSION}..."

    # Check if Go is already installed with the correct version
    if command -v go &> /dev/null; then
        CURRENT_GO_VERSION=$(go version | awk '{print $3}' | sed 's/go//')
        if [ "$CURRENT_GO_VERSION" = "$GO_VERSION" ]; then
            warn "Go ${GO_VERSION} is already installed"
            return 0
        else
            warn "Go version ${CURRENT_GO_VERSION} found, upgrading to ${GO_VERSION}..."
        fi
    fi

    # Download and install Go
    cd /tmp
    wget "https://go.dev/dl/go${GO_VERSION}.linux-${GO_ARCH}.tar.gz" >> "$LOG_FILE" 2>&1

    # Remove old Go installation if exists
    rm -rf /usr/local/go

    # Extract new Go installation
    tar -C /usr/local -xzf "go${GO_VERSION}.linux-${GO_ARCH}.tar.gz"

    # Clean up
    rm "go${GO_VERSION}.linux-${GO_ARCH}.tar.gz"

    # Add Go to PATH for all users
    if ! grep -q "/usr/local/go/bin" /etc/profile; then
        echo 'export PATH=$PATH:/usr/local/go/bin' >> /etc/profile
        echo 'export GOPATH=$HOME/go' >> /etc/profile
        echo 'export PATH=$PATH:$GOPATH/bin' >> /etc/profile
    fi

    # Add to current session
    export PATH=$PATH:/usr/local/go/bin
    export GOPATH=$HOME/go
    export PATH=$PATH:$GOPATH/bin

    log "Go ${GO_VERSION} installed successfully"
}

# Install Node.js
install_nodejs() {
    if [ "$SKIP_NODE" = true ]; then
        info "Skipping Node.js installation (--skip-node)"
        return 0
    fi

    log "Installing Node.js ${NODE_MAJOR_VERSION}.x..."

    # Check if Node.js is already installed with correct major version
    if command -v node &> /dev/null; then
        CURRENT_NODE_MAJOR=$(node --version | sed 's/v//' | cut -d. -f1)
        if [ "$CURRENT_NODE_MAJOR" -ge "$NODE_MAJOR_VERSION" ]; then
            warn "Node.js $(node --version) is already installed (>= ${NODE_MAJOR_VERSION}.x)"
            return 0
        else
            log "Upgrading Node.js from v$CURRENT_NODE_MAJOR to ${NODE_MAJOR_VERSION}.x..."
        fi
    fi

    if [ "$OS" = "amzn" ] || [ "$OS" = "rhel" ] || [ "$OS" = "centos" ]; then
        # Remove existing Node.js
        dnf remove -y nodejs nodejs-full-i18n nodejs-npm 2>/dev/null || \
        yum remove -y nodejs nodejs-full-i18n nodejs-npm 2>/dev/null || true

        # Add NodeSource repository
        curl -fsSL "https://rpm.nodesource.com/setup_${NODE_MAJOR_VERSION}.x" | bash - >> "$LOG_FILE" 2>&1

        # Install Node.js
        dnf install -y nodejs >> "$LOG_FILE" 2>&1 || yum install -y nodejs >> "$LOG_FILE" 2>&1

    elif [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
        # Add NodeSource repository
        mkdir -p /etc/apt/keyrings
        curl -fsSL "https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key" | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
        echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_${NODE_MAJOR_VERSION}.x nodistro main" > /etc/apt/sources.list.d/nodesource.list

        # Install Node.js
        apt-get update >> "$LOG_FILE" 2>&1
        apt-get install -y nodejs >> "$LOG_FILE" 2>&1
    fi

    log "Node.js installed successfully"
}

# Configure Docker permissions
configure_docker_permissions() {
    log "Configuring Docker permissions..."

    for user in ec2-user ubuntu $SUDO_USER; do
        if id "$user" &>/dev/null; then
            usermod -aG docker "$user" >> "$LOG_FILE" 2>&1 || true
            log "Added user '$user' to docker group"
        fi
    done

    info "Users need to log out and back in for Docker group membership to take effect"
    info "Or run: newgrp docker"
}

# Setup IntentR project directory
setup_project_directory() {
    log "Setting up project directory..."

    if [ ! -d "$PROJECT_DIR" ]; then
        mkdir -p "$PROJECT_DIR"
        log "Created project directory: $PROJECT_DIR"
    else
        warn "Project directory already exists: $PROJECT_DIR"
    fi

    if [ -n "$SUDO_USER" ]; then
        chown -R $SUDO_USER:$SUDO_USER "$PROJECT_DIR"
        log "Set ownership of $PROJECT_DIR to $SUDO_USER"
    fi
}

# Validate installation
validate_installation() {
    log "Validating installation..."

    local failed=0

    # Check Git
    if command -v git &> /dev/null; then
        info "Git: $(git --version)"
    else
        error "Git not found"
        failed=1
    fi

    # Check Docker
    if command -v docker &> /dev/null; then
        info "Docker: $(docker --version)"
    else
        warn "Docker not found (may have been skipped)"
    fi

    # Check Docker Compose
    if docker compose version &> /dev/null 2>&1; then
        info "Docker Compose: $(docker compose version 2>/dev/null | head -1)"
    elif command -v docker-compose &> /dev/null; then
        info "Docker Compose: $(docker-compose --version)"
    else
        warn "Docker Compose not found"
    fi

    # Check Docker Buildx
    if docker buildx version &> /dev/null 2>&1; then
        info "Docker Buildx: $(docker buildx version 2>/dev/null | head -1)"
    else
        warn "Docker Buildx not found"
    fi

    # Check Go
    if command -v go &> /dev/null; then
        info "Go: $(go version)"
    else
        warn "Go not found (may have been skipped)"
    fi

    # Check Node.js
    if command -v node &> /dev/null; then
        info "Node.js: $(node --version)"
        info "npm: $(npm --version)"
    else
        warn "Node.js not found (may have been skipped)"
    fi

    # Check Make
    if command -v make &> /dev/null; then
        info "Make: $(make --version | head -1)"
    else
        warn "Make not found (optional)"
    fi

    # Check storage
    if mountpoint -q /data 2>/dev/null; then
        info "Storage: /data mounted ($(df -h /data | tail -1 | awk '{print $2}'))"
    else
        info "Storage: Using root filesystem"
    fi

    if [ $failed -eq 1 ]; then
        error "Installation validation failed"
    else
        log "All components validated successfully!"
    fi
}

# Configure nginx for IntentR
configure_nginx() {
    if [ "$SKIP_NGINX" = true ]; then
        warn "Skipping nginx configuration (--skip-nginx)"
        return
    fi

    log "Configuring nginx reverse proxy..."

    # Get the script directory
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

    # Check if configure-nginx.sh exists
    if [[ -f "$SCRIPT_DIR/configure-nginx.sh" ]]; then
        chmod +x "$SCRIPT_DIR/configure-nginx.sh"
        "$SCRIPT_DIR/configure-nginx.sh" 2>&1 | tee -a "$LOG_FILE" || {
            warn "Nginx configuration script failed - can be run manually later"
        }
    else
        warn "configure-nginx.sh not found - nginx will need manual configuration"
        info "After starting services, run: ./scripts/setup/AWS/configure-nginx.sh"
    fi

    log "Nginx configuration complete"
}

# Display next steps
display_next_steps() {
    echo ""
    log "=================================================="
    log "  IntentR Microservices Setup Complete!"
    log "=================================================="
    echo ""
    info "Next steps:"
    echo ""
    echo "  1. Log out and log back in (or run: newgrp docker)"
    echo ""
    echo "  2. Clone the IntentR repository (if not done):"
    echo "     cd $PROJECT_DIR"
    echo "     git clone https://github.com/jareynolds/intentr.git"
    echo "     cd intentr"
    echo ""
    echo "  3. Create environment configuration:"
    echo "     cp .env.example .env  # if exists"
    echo "     # Add your API keys to .env"
    echo ""
    echo "  4. Start the application:"
    echo "     ./start.sh"
    echo ""
    echo "  5. Access the application:"
    echo "     Local:    http://localhost:6175"
    echo "     External: http://<your-public-ip>"
    echo ""
    echo "  For more information, see:"
    echo "     - README.md"
    echo "     - scripts/setup/AWS/README-SETUP.md"
    echo ""
    log "Setup log saved to: $LOG_FILE"
    echo ""
}

################################################################################
# Main Execution
################################################################################

main() {
    parse_args "$@"

    log "Starting IntentR Microservices Environment Setup"
    log "=================================================="

    check_root
    detect_architecture
    detect_distribution
    update_system
    install_dependencies
    setup_storage
    install_docker
    install_docker_compose
    install_docker_buildx
    install_go
    install_nodejs
    configure_docker_permissions
    setup_project_directory
    configure_nginx
    validate_installation
    display_next_steps

    log "Setup completed successfully!"
}

# Run main function
main "$@"
