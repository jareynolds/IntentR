#!/bin/bash

# UbeCode Dependencies Installation Script for Fresh EC2 Instance (Amazon Linux 2023)
# This script installs all required dependencies for the UbeCode application

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo -e "${BOLD}${BLUE}========================================${NC}"
echo -e "${BOLD}${BLUE}  UbeCode Dependencies Installation${NC}"
echo -e "${BOLD}${BLUE}========================================${NC}"
echo ""

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to print status
print_status() {
    echo -e "  ${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "  ${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "  ${RED}✗${NC} $1"
}

# Detect OS
detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
        VERSION=$VERSION_ID
    else
        OS=$(uname -s)
    fi
    echo -e "${CYAN}Detected OS: $OS${NC}"
}

detect_os

echo ""
echo -e "${YELLOW}Step 1: Updating system packages...${NC}"
if [[ "$OS" == "amzn" ]] || [[ "$OS" == "rhel" ]] || [[ "$OS" == "centos" ]] || [[ "$OS" == "fedora" ]]; then
    sudo dnf update -y
    print_status "System packages updated"
elif [[ "$OS" == "ubuntu" ]] || [[ "$OS" == "debian" ]]; then
    sudo apt-get update -y && sudo apt-get upgrade -y
    print_status "System packages updated"
else
    print_warning "Unknown OS, skipping system update"
fi

echo ""
echo -e "${YELLOW}Step 2: Installing essential build tools...${NC}"
if [[ "$OS" == "amzn" ]] || [[ "$OS" == "rhel" ]] || [[ "$OS" == "centos" ]] || [[ "$OS" == "fedora" ]]; then
    sudo dnf groupinstall -y "Development Tools"
    sudo dnf install -y git curl wget tar gzip make gcc
elif [[ "$OS" == "ubuntu" ]] || [[ "$OS" == "debian" ]]; then
    sudo apt-get install -y build-essential git curl wget tar gzip make gcc
fi
print_status "Build tools installed"

echo ""
echo -e "${YELLOW}Step 3: Installing Go 1.24...${NC}"
if command_exists go; then
    GO_VERSION=$(go version | awk '{print $3}')
    print_warning "Go already installed ($GO_VERSION)"
else
    # Download and install Go 1.24
    GO_VERSION="1.24.0"
    ARCH=$(uname -m)

    if [[ "$ARCH" == "x86_64" ]]; then
        GO_ARCH="amd64"
    elif [[ "$ARCH" == "aarch64" ]] || [[ "$ARCH" == "arm64" ]]; then
        GO_ARCH="arm64"
    else
        print_error "Unsupported architecture: $ARCH"
        exit 1
    fi

    echo -e "${CYAN}Downloading Go $GO_VERSION for $GO_ARCH...${NC}"
    curl -LO "https://go.dev/dl/go${GO_VERSION}.linux-${GO_ARCH}.tar.gz"

    # Remove any existing Go installation
    sudo rm -rf /usr/local/go

    # Extract Go
    sudo tar -C /usr/local -xzf "go${GO_VERSION}.linux-${GO_ARCH}.tar.gz"
    rm "go${GO_VERSION}.linux-${GO_ARCH}.tar.gz"

    # Add Go to PATH
    if ! grep -q '/usr/local/go/bin' ~/.bashrc; then
        echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
        echo 'export PATH=$PATH:$(go env GOPATH)/bin' >> ~/.bashrc
    fi

    # Export for current session
    export PATH=$PATH:/usr/local/go/bin

    print_status "Go $GO_VERSION installed"
fi

# Verify Go
if command_exists go; then
    echo -e "  Go version: $(go version)"
fi

echo ""
echo -e "${YELLOW}Step 4: Installing Node.js (LTS)...${NC}"
if command_exists node; then
    NODE_VERSION=$(node --version)
    print_warning "Node.js already installed ($NODE_VERSION)"
else
    # Install Node.js via NodeSource
    if [[ "$OS" == "amzn" ]]; then
        # Amazon Linux 2023
        curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
        sudo dnf install -y nodejs
    elif [[ "$OS" == "rhel" ]] || [[ "$OS" == "centos" ]] || [[ "$OS" == "fedora" ]]; then
        curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
        sudo dnf install -y nodejs
    elif [[ "$OS" == "ubuntu" ]] || [[ "$OS" == "debian" ]]; then
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt-get install -y nodejs
    fi
    print_status "Node.js installed"
fi

# Verify Node.js and npm
if command_exists node; then
    echo -e "  Node.js version: $(node --version)"
fi
if command_exists npm; then
    echo -e "  npm version: $(npm --version)"
fi

echo ""
echo -e "${YELLOW}Step 5: Installing Docker...${NC}"
if command_exists docker; then
    DOCKER_VERSION=$(docker --version)
    print_warning "Docker already installed ($DOCKER_VERSION)"
else
    if [[ "$OS" == "amzn" ]]; then
        # Amazon Linux 2023 - Docker is available in extras
        sudo dnf install -y docker
        sudo systemctl start docker
        sudo systemctl enable docker
        # Add current user to docker group
        sudo usermod -aG docker $USER
    elif [[ "$OS" == "ubuntu" ]] || [[ "$OS" == "debian" ]]; then
        # Install Docker using official script
        curl -fsSL https://get.docker.com -o get-docker.sh
        sudo sh get-docker.sh
        rm get-docker.sh
        sudo systemctl start docker
        sudo systemctl enable docker
        sudo usermod -aG docker $USER
    elif [[ "$OS" == "rhel" ]] || [[ "$OS" == "centos" ]] || [[ "$OS" == "fedora" ]]; then
        sudo dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
        sudo dnf install -y docker-ce docker-ce-cli containerd.io
        sudo systemctl start docker
        sudo systemctl enable docker
        sudo usermod -aG docker $USER
    fi
    print_status "Docker installed"
fi

echo ""
echo -e "${YELLOW}Step 6: Installing Docker Compose...${NC}"
if docker compose version >/dev/null 2>&1; then
    COMPOSE_VERSION=$(docker compose version --short)
    print_warning "Docker Compose already installed ($COMPOSE_VERSION)"
else
    # Docker Compose V2 is included as a Docker plugin in recent Docker installations
    # If not available, install it manually
    COMPOSE_VERSION="v2.24.0"
    ARCH=$(uname -m)

    if [[ "$ARCH" == "x86_64" ]]; then
        COMPOSE_ARCH="x86_64"
    elif [[ "$ARCH" == "aarch64" ]] || [[ "$ARCH" == "arm64" ]]; then
        COMPOSE_ARCH="aarch64"
    fi

    sudo mkdir -p /usr/local/lib/docker/cli-plugins
    sudo curl -SL "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-linux-${COMPOSE_ARCH}" \
        -o /usr/local/lib/docker/cli-plugins/docker-compose
    sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
    print_status "Docker Compose installed"
fi

echo ""
echo -e "${YELLOW}Step 7: Installing PostgreSQL client tools...${NC}"
if command_exists psql; then
    PSQL_VERSION=$(psql --version)
    print_warning "PostgreSQL client already installed ($PSQL_VERSION)"
else
    if [[ "$OS" == "amzn" ]] || [[ "$OS" == "rhel" ]] || [[ "$OS" == "centos" ]] || [[ "$OS" == "fedora" ]]; then
        sudo dnf install -y postgresql16
    elif [[ "$OS" == "ubuntu" ]] || [[ "$OS" == "debian" ]]; then
        sudo apt-get install -y postgresql-client
    fi
    print_status "PostgreSQL client installed"
fi

echo ""
echo -e "${YELLOW}Step 8: Installing additional utilities...${NC}"
if [[ "$OS" == "amzn" ]] || [[ "$OS" == "rhel" ]] || [[ "$OS" == "centos" ]] || [[ "$OS" == "fedora" ]]; then
    sudo dnf install -y lsof jq htop
elif [[ "$OS" == "ubuntu" ]] || [[ "$OS" == "debian" ]]; then
    sudo apt-get install -y lsof jq htop
fi
print_status "Additional utilities installed (lsof, jq, htop)"

echo ""
echo -e "${YELLOW}Step 9: Setting up project dependencies...${NC}"

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Download Go dependencies
echo -e "${CYAN}Downloading Go module dependencies...${NC}"
cd "$SCRIPT_DIR"
if [ -f "go.mod" ]; then
    # Ensure Go is in PATH for this session
    export PATH=$PATH:/usr/local/go/bin
    go mod download
    go mod tidy
    print_status "Go dependencies downloaded"
else
    print_warning "go.mod not found, skipping Go dependencies"
fi

# Install web-ui dependencies
echo -e "${CYAN}Installing web-ui npm dependencies...${NC}"
if [ -d "$SCRIPT_DIR/web-ui" ]; then
    cd "$SCRIPT_DIR/web-ui"
    npm install
    print_status "web-ui npm dependencies installed"
else
    print_warning "web-ui directory not found"
fi

cd "$SCRIPT_DIR"

echo ""
echo -e "${YELLOW}Step 10: Creating .env file template...${NC}"
if [ ! -f "$SCRIPT_DIR/.env" ]; then
    cat > "$SCRIPT_DIR/.env" << 'EOF'
# UbeCode Environment Configuration
# Copy this file to .env and fill in your values

# Figma API Token (required for Figma integration)
FIGMA_TOKEN=your_figma_token_here

# Anthropic API Key (required for AI features)
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# JWT Secret for authentication (generate a secure random string)
JWT_SECRET=your-secret-key-change-in-production

# Google OAuth2 (optional, for Google sign-in)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URL=http://localhost:6173/auth/google/callback

# Database settings (default values work with docker-compose)
DB_HOST=localhost
DB_PORT=6432
DB_USER=ubecode_user
DB_PASSWORD=ubecode_password
DB_NAME=ubecode_db
EOF
    print_status ".env template created"
    print_warning "Please edit .env file with your API keys"
else
    print_warning ".env file already exists"
fi

echo ""
echo -e "${YELLOW}Step 11: Making scripts executable...${NC}"
chmod +x "$SCRIPT_DIR/start.sh" 2>/dev/null || true
chmod +x "$SCRIPT_DIR/stop.sh" 2>/dev/null || true
chmod +x "$SCRIPT_DIR/status.sh" 2>/dev/null || true
chmod +x "$SCRIPT_DIR/install-dep.sh" 2>/dev/null || true
print_status "Scripts made executable"

echo ""
echo -e "${BOLD}${GREEN}========================================${NC}"
echo -e "${BOLD}${GREEN}  Installation Complete!${NC}"
echo -e "${BOLD}${GREEN}========================================${NC}"
echo ""
echo -e "${BOLD}Installed Components:${NC}"
echo -e "  ${GREEN}✓${NC} Go 1.24"
echo -e "  ${GREEN}✓${NC} Node.js 20.x LTS"
echo -e "  ${GREEN}✓${NC} npm"
echo -e "  ${GREEN}✓${NC} Docker"
echo -e "  ${GREEN}✓${NC} Docker Compose"
echo -e "  ${GREEN}✓${NC} PostgreSQL client"
echo -e "  ${GREEN}✓${NC} Build tools (git, make, gcc)"
echo -e "  ${GREEN}✓${NC} Utilities (lsof, jq, htop)"
echo -e "  ${GREEN}✓${NC} Go module dependencies"
echo -e "  ${GREEN}✓${NC} web-ui npm dependencies"
echo ""
echo -e "${BOLD}${YELLOW}Important Next Steps:${NC}"
echo ""
echo -e "1. ${CYAN}Log out and log back in${NC} (or run 'newgrp docker') to use Docker without sudo"
echo ""
echo -e "2. ${CYAN}Configure your .env file:${NC}"
echo -e "   nano .env"
echo -e "   - Add your FIGMA_TOKEN"
echo -e "   - Add your ANTHROPIC_API_KEY"
echo -e "   - Update JWT_SECRET with a secure random string"
echo ""
echo -e "3. ${CYAN}Start the application:${NC}"
echo -e "   ./start.sh"
echo ""
echo -e "4. ${CYAN}Access the application:${NC}"
echo -e "   http://localhost:6175 (or your EC2 public IP)"
echo ""
echo -e "${BOLD}Useful Commands:${NC}"
echo -e "  ./start.sh          # Start all services"
echo -e "  ./stop.sh           # Stop all services"
echo -e "  ./status.sh         # Check service status"
echo -e "  make build          # Build Go services"
echo -e "  make test           # Run tests"
echo ""
