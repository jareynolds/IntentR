#!/bin/bash

################################################################################
# UbeCode Microservices Environment Setup Script for AWS EC2 Linux
################################################################################
# This script sets up the complete environment for running UbeCode microservices
# on an AWS EC2 Linux instance (Amazon Linux 2 or Ubuntu).
#
# Usage:
#   sudo ./setup-ec2-environment.sh
#
# What this script does:
#   1. Detects Linux distribution (Amazon Linux 2 or Ubuntu)
#   2. Installs system dependencies
#   3. Installs Docker and Docker Compose
#   4. Installs Go 1.21+
#   5. Installs development tools (git, make, wget)
#   6. Configures user permissions for Docker
#   7. Sets up the UbeCode project
#   8. Validates the installation
################################################################################

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
GO_VERSION="1.21.6"
DOCKER_COMPOSE_VERSION="2.24.5"
PROJECT_DIR="/opt/ubecode"
LOG_FILE="/var/log/ubecode-setup.log"

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

################################################################################
# Installation Functions
################################################################################

# Update system packages
update_system() {
    log "Updating system packages..."

    if [ "$OS" = "amzn" ] || [ "$OS" = "rhel" ] || [ "$OS" = "centos" ]; then
        yum update -y >> "$LOG_FILE" 2>&1
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
            >> "$LOG_FILE" 2>&1
    fi

    log "Basic dependencies installed successfully"
}

# Install Docker
install_docker() {
    log "Installing Docker..."

    # Check if Docker is already installed
    if command -v docker &> /dev/null; then
        DOCKER_VERSION=$(docker --version)
        warn "Docker is already installed: $DOCKER_VERSION"
        return 0
    fi

    if [ "$OS" = "amzn" ]; then
        # Amazon Linux 2
        yum install -y docker >> "$LOG_FILE" 2>&1
        systemctl enable docker
        systemctl start docker
    elif [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
        # Ubuntu/Debian
        # Remove old versions
        apt-get remove -y docker docker-engine docker.io containerd runc >> "$LOG_FILE" 2>&1 || true

        # Install Docker using official repository
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
}

# Install Docker Compose
install_docker_compose() {
    log "Installing Docker Compose..."

    # Check if Docker Compose is already installed
    if command -v docker-compose &> /dev/null || docker compose version &> /dev/null; then
        if docker compose version &> /dev/null; then
            COMPOSE_VERSION=$(docker compose version)
        else
            COMPOSE_VERSION=$(docker-compose --version)
        fi
        warn "Docker Compose is already installed: $COMPOSE_VERSION"
        return 0
    fi

    # Install Docker Compose V2 (plugin)
    DOCKER_CONFIG=${DOCKER_CONFIG:-$HOME/.docker}
    mkdir -p $DOCKER_CONFIG/cli-plugins

    curl -SL "https://github.com/docker/compose/releases/download/v${DOCKER_COMPOSE_VERSION}/docker-compose-linux-x86_64" \
        -o $DOCKER_CONFIG/cli-plugins/docker-compose >> "$LOG_FILE" 2>&1

    chmod +x $DOCKER_CONFIG/cli-plugins/docker-compose

    # Also create symlink for backward compatibility
    ln -sf $DOCKER_CONFIG/cli-plugins/docker-compose /usr/local/bin/docker-compose || true

    log "Docker Compose installed successfully"
}

# Install Go
install_go() {
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
    wget "https://go.dev/dl/go${GO_VERSION}.linux-amd64.tar.gz" >> "$LOG_FILE" 2>&1

    # Remove old Go installation if exists
    rm -rf /usr/local/go

    # Extract new Go installation
    tar -C /usr/local -xzf "go${GO_VERSION}.linux-amd64.tar.gz"

    # Clean up
    rm "go${GO_VERSION}.linux-amd64.tar.gz"

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

# Configure Docker permissions
configure_docker_permissions() {
    log "Configuring Docker permissions..."

    # Add users to docker group
    # Try to add ec2-user (Amazon Linux) and ubuntu (Ubuntu)
    for user in ec2-user ubuntu $SUDO_USER; do
        if id "$user" &>/dev/null; then
            usermod -aG docker "$user" >> "$LOG_FILE" 2>&1 || true
            log "Added user '$user' to docker group"
        fi
    done

    info "Users need to log out and back in for Docker group membership to take effect"
    info "Or run: newgrp docker"
}

# Setup UbeCode project directory
setup_project_directory() {
    log "Setting up project directory..."

    # Create project directory if it doesn't exist
    if [ ! -d "$PROJECT_DIR" ]; then
        mkdir -p "$PROJECT_DIR"
        log "Created project directory: $PROJECT_DIR"
    else
        warn "Project directory already exists: $PROJECT_DIR"
    fi

    # Set proper ownership
    if [ -n "$SUDO_USER" ]; then
        chown -R $SUDO_USER:$SUDO_USER "$PROJECT_DIR"
        log "Set ownership of $PROJECT_DIR to $SUDO_USER"
    fi
}

# Install development tools
install_dev_tools() {
    log "Installing development tools..."

    # Install goimports and other useful Go tools
    export PATH=$PATH:/usr/local/go/bin
    export GOPATH=$HOME/go

    if [ -n "$SUDO_USER" ]; then
        sudo -u $SUDO_USER bash -c '
            export PATH=$PATH:/usr/local/go/bin
            export GOPATH=$HOME/go
            go install golang.org/x/tools/cmd/goimports@latest 2>&1
        ' >> "$LOG_FILE"
    else
        go install golang.org/x/tools/cmd/goimports@latest >> "$LOG_FILE" 2>&1
    fi

    log "Development tools installed successfully"
}

# Validate installation
validate_installation() {
    log "Validating installation..."

    local failed=0

    # Check Git
    if command -v git &> /dev/null; then
        info "✓ Git: $(git --version)"
    else
        error "✗ Git not found"
        failed=1
    fi

    # Check Docker
    if command -v docker &> /dev/null; then
        info "✓ Docker: $(docker --version)"
    else
        error "✗ Docker not found"
        failed=1
    fi

    # Check Docker Compose
    if docker compose version &> /dev/null; then
        info "✓ Docker Compose: $(docker compose version)"
    elif command -v docker-compose &> /dev/null; then
        info "✓ Docker Compose: $(docker-compose --version)"
    else
        error "✗ Docker Compose not found"
        failed=1
    fi

    # Check Go
    if command -v go &> /dev/null; then
        info "✓ Go: $(go version)"
    else
        error "✗ Go not found"
        failed=1
    fi

    # Check Make
    if command -v make &> /dev/null; then
        info "✓ Make: $(make --version | head -1)"
    else
        warn "✗ Make not found (optional)"
    fi

    if [ $failed -eq 1 ]; then
        error "Installation validation failed"
    else
        log "All components validated successfully!"
    fi
}

# Display next steps
display_next_steps() {
    echo ""
    log "=================================================="
    log "  UbeCode Microservices Setup Complete!"
    log "=================================================="
    echo ""
    info "Next steps:"
    echo ""
    echo "  1. Log out and log back in (or run: newgrp docker)"
    echo ""
    echo "  2. Clone the UbeCode repository:"
    echo "     cd $PROJECT_DIR"
    echo "     git clone https://github.com/jareynolds/ubecode.git"
    echo "     cd ubecode"
    echo ""
    echo "  3. Create environment configuration:"
    echo "     cp .env.example .env  # if exists"
    echo "     # or create .env with:"
    echo "     echo 'FIGMA_TOKEN=your_figma_token_here' > .env"
    echo ""
    echo "  4. Build and run the services:"
    echo "     make docker-build"
    echo "     make docker-up"
    echo ""
    echo "  5. Check service status:"
    echo "     docker-compose ps"
    echo "     curl http://localhost:8080/health  # Integration Service"
    echo "     curl http://localhost:8081/health  # Design Service"
    echo "     curl http://localhost:8082/health  # Capability Service"
    echo ""
    echo "  For more information, see:"
    echo "     - README.md"
    echo "     - scripts/setup/README-SETUP.md"
    echo ""
    log "Setup log saved to: $LOG_FILE"
    echo ""
}

################################################################################
# Main Execution
################################################################################

main() {
    log "Starting UbeCode Microservices Environment Setup"
    log "=================================================="

    check_root
    detect_distribution
    update_system
    install_dependencies
    install_docker
    install_docker_compose
    install_go
    configure_docker_permissions
    setup_project_directory
    install_dev_tools
    validate_installation
    display_next_steps

    log "Setup completed successfully!"
}

# Run main function
main "$@"
