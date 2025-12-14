#!/bin/bash

################################################################################
# Go Programming Language Installation Script
################################################################################
# This script installs Go 1.21+ on AWS EC2 Linux instances
#
# Usage:
#   sudo ./install-golang.sh [version]
#   Example: sudo ./install-golang.sh 1.21.6
################################################################################

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Default Go version
GO_VERSION="${1:-1.21.6}"

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

log "Installing Go ${GO_VERSION}..."

# Check if Go is already installed with the correct version
if command -v go &> /dev/null; then
    CURRENT_GO_VERSION=$(go version | awk '{print $3}' | sed 's/go//')
    if [ "$CURRENT_GO_VERSION" = "$GO_VERSION" ]; then
        warn "Go ${GO_VERSION} is already installed"
        go version
        exit 0
    else
        warn "Go version ${CURRENT_GO_VERSION} found, upgrading to ${GO_VERSION}..."
    fi
fi

# Install wget if not present
if ! command -v wget &> /dev/null; then
    log "Installing wget..."
    if command -v yum &> /dev/null; then
        yum install -y wget
    elif command -v apt-get &> /dev/null; then
        apt-get update && apt-get install -y wget
    fi
fi

# Download and install Go
log "Downloading Go ${GO_VERSION}..."
cd /tmp
wget -q "https://go.dev/dl/go${GO_VERSION}.linux-amd64.tar.gz"

# Remove old Go installation if exists
log "Removing old Go installation..."
rm -rf /usr/local/go

# Extract new Go installation
log "Installing Go ${GO_VERSION}..."
tar -C /usr/local -xzf "go${GO_VERSION}.linux-amd64.tar.gz"

# Clean up
rm "go${GO_VERSION}.linux-amd64.tar.gz"

# Configure environment variables
log "Configuring environment variables..."

# Add Go to PATH for all users via /etc/profile
if ! grep -q "/usr/local/go/bin" /etc/profile; then
    cat >> /etc/profile << 'EOF'

# Go Programming Language
export PATH=$PATH:/usr/local/go/bin
export GOPATH=$HOME/go
export PATH=$PATH:$GOPATH/bin
EOF
    log "Added Go to /etc/profile"
fi

# Also add to current session
export PATH=$PATH:/usr/local/go/bin
export GOPATH=$HOME/go
export PATH=$PATH:$GOPATH/bin

# Add for common users
for user_home in /home/*; do
    if [ -d "$user_home" ]; then
        user=$(basename "$user_home")
        user_profile="$user_home/.profile"
        user_bashrc="$user_home/.bashrc"

        for profile_file in "$user_profile" "$user_bashrc"; do
            if [ -f "$profile_file" ]; then
                if ! grep -q "/usr/local/go/bin" "$profile_file"; then
                    cat >> "$profile_file" << 'EOF'

# Go Programming Language
export PATH=$PATH:/usr/local/go/bin
export GOPATH=$HOME/go
export PATH=$PATH:$GOPATH/bin
EOF
                    chown $user:$user "$profile_file"
                fi
            fi
        done
    fi
done

# Verify installation
log "Verifying Go installation..."
/usr/local/go/bin/go version

log "Go ${GO_VERSION} installed successfully!"
log "Run 'source /etc/profile' or log out and back in to update your PATH"
log ""
log "To verify: go version"
