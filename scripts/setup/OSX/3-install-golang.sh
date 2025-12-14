#!/bin/bash

################################################################################
# Go Programming Language Installation Script for macOS
################################################################################
# This script installs Go 1.24+ on macOS
#
# Prerequisites:
#   - macOS 11 (Big Sur) or later
#   - Homebrew (installed by install-dependencies.sh)
#
# Usage:
#   ./3-install-golang.sh [version] [--force]
#   Example: ./3-install-golang.sh 1.24.0
#
# Options:
#   --force    Reinstall Go even if already installed
#
# Sequence: Run scripts in numerical order (Step 3 of 5)
#   1-install-dependencies.sh   (completed)
#   2-install-docker.sh         (completed)
#   3-install-golang.sh         <-- YOU ARE HERE
#   4-configure-environment.sh
#   5-verify-setup.sh
#
# IDEMPOTENT: If Go is already installed with the required version,
#             it will be skipped and the script will continue.
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
GO_VERSION="1.24.0"
for arg in "$@"; do
    case $arg in
        --force)
            FORCE_REINSTALL=true
            ;;
        *)
            # Assume it's a version number if it starts with a digit
            if [[ "$arg" =~ ^[0-9] ]]; then
                GO_VERSION="$arg"
            fi
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
}

# Check for Homebrew
check_homebrew() {
    if ! command -v brew &> /dev/null; then
        error "Homebrew is not installed. Please run 1-install-dependencies.sh first."
    fi
}

# Detect chip architecture
detect_architecture() {
    ARCH=$(uname -m)
    if [[ "$ARCH" == "arm64" ]]; then
        log "Detected Apple Silicon (arm64)"
        GO_ARCH="arm64"
    else
        log "Detected Intel (x86_64)"
        GO_ARCH="amd64"
    fi
}

# Check if Go is already installed
check_go_installed() {
    if command -v go &> /dev/null; then
        CURRENT_GO_VERSION=$(go version | awk '{print $3}' | sed 's/go//')
        log "Go already installed: go$CURRENT_GO_VERSION"

        if [ "$FORCE_REINSTALL" = true ]; then
            warn "Force reinstall requested for Go"
            return 2
        fi

        # Compare versions (simple string comparison)
        MAJOR_CURRENT=$(echo "$CURRENT_GO_VERSION" | cut -d. -f1)
        MINOR_CURRENT=$(echo "$CURRENT_GO_VERSION" | cut -d. -f2)
        MAJOR_REQUIRED=$(echo "$GO_VERSION" | cut -d. -f1)
        MINOR_REQUIRED=$(echo "$GO_VERSION" | cut -d. -f2)

        if [[ "$MAJOR_CURRENT" -ge "$MAJOR_REQUIRED" ]] && [[ "$MINOR_CURRENT" -ge "$MINOR_REQUIRED" ]]; then
            log "Go version meets requirements (>= $GO_VERSION) - skipping installation, continuing..."
            return 0
        else
            warn "Current Go version ($CURRENT_GO_VERSION) is older than required ($GO_VERSION) - upgrading..."
            return 1
        fi
    fi
    return 2
}

# Install Go via Homebrew
install_go_homebrew() {
    log "Installing Go via Homebrew..."

    if brew list go &> /dev/null; then
        log "Upgrading Go via Homebrew..."
        brew upgrade go || warn "Go is already at the latest Homebrew version"
    else
        brew install go
    fi

    log "Go installed successfully via Homebrew"
}

# Alternative: Install specific Go version directly
install_go_direct() {
    log "Installing Go ${GO_VERSION} directly..."

    local download_url="https://go.dev/dl/go${GO_VERSION}.darwin-${GO_ARCH}.pkg"
    local pkg_file="/tmp/go${GO_VERSION}.darwin-${GO_ARCH}.pkg"

    # Download the package
    log "Downloading Go ${GO_VERSION}..."
    curl -fsSL "$download_url" -o "$pkg_file"

    # Install the package
    log "Installing Go ${GO_VERSION}..."
    sudo installer -pkg "$pkg_file" -target /

    # Clean up
    rm -f "$pkg_file"

    log "Go ${GO_VERSION} installed successfully"
}

# Configure Go environment
configure_go_env() {
    log "Configuring Go environment..."

    # Determine shell config file
    local shell_config=""
    if [[ -f "$HOME/.zshrc" ]]; then
        shell_config="$HOME/.zshrc"
    elif [[ -f "$HOME/.bashrc" ]]; then
        shell_config="$HOME/.bashrc"
    elif [[ -f "$HOME/.bash_profile" ]]; then
        shell_config="$HOME/.bash_profile"
    else
        shell_config="$HOME/.zprofile"
    fi

    # Add Go paths if not already present
    if ! grep -q "GOPATH" "$shell_config" 2>/dev/null; then
        log "Adding Go environment variables to $shell_config"
        cat >> "$shell_config" << 'EOF'

# Go Programming Language
export GOPATH=$HOME/go
export PATH=$PATH:$GOPATH/bin
EOF
    else
        log "Go environment variables already configured in $shell_config"
    fi

    # Export for current session
    export GOPATH=$HOME/go
    export PATH=$PATH:$GOPATH/bin

    # Create GOPATH directory if it doesn't exist
    if [[ ! -d "$GOPATH" ]]; then
        mkdir -p "$GOPATH"/{bin,src,pkg}
        log "Created GOPATH directory: $GOPATH"
    fi
}

# Install useful Go development tools
install_go_tools() {
    log "Installing Go development tools..."

    # Ensure Go is in PATH
    export PATH=$PATH:/usr/local/go/bin
    export PATH=$PATH:$(go env GOPATH)/bin

    # Install common development tools
    local tools=(
        "golang.org/x/tools/cmd/goimports@latest"
        "github.com/golangci/golangci-lint/cmd/golangci-lint@latest"
    )

    for tool in "${tools[@]}"; do
        local tool_name=$(echo "$tool" | rev | cut -d'/' -f1 | cut -d'@' -f2 | rev)
        log "  Installing $tool_name..."
        go install "$tool" 2>/dev/null || warn "Failed to install $tool_name (non-critical)"
    done

    log "Go development tools installed"
}

# Verify Go installation
verify_go() {
    log "Verifying Go installation..."

    # Source the shell config to get updated PATH
    export GOPATH=$HOME/go
    export PATH=$PATH:$GOPATH/bin

    if command -v go &> /dev/null; then
        echo -e "  ${GREEN}✓${NC} Go: $(go version)"
        echo -e "  ${GREEN}✓${NC} GOPATH: $(go env GOPATH)"
        echo -e "  ${GREEN}✓${NC} GOROOT: $(go env GOROOT)"
        return 0
    else
        echo -e "  ${RED}✗${NC} Go not found in PATH"
        return 1
    fi
}

# Display next steps
show_next_steps() {
    echo ""
    log "=================================================="
    log "  Go Installation Complete!"
    log "=================================================="
    echo ""
    info "Note: You may need to restart your terminal or run:"
    echo "    source ~/.zshrc    # or ~/.bashrc"
    echo ""
    info "Next step (4 of 5):"
    echo ""
    echo "  Run the environment configuration script:"
    echo "    ./4-configure-environment.sh"
    echo ""
}

################################################################################
# Main Execution
################################################################################

main() {
    log "Starting Go installation for macOS..."
    log "Target version: Go ${GO_VERSION}"
    if [ "$FORCE_REINSTALL" = true ]; then
        warn "Force mode enabled - will reinstall Go"
    fi
    echo ""

    check_macos
    check_homebrew
    detect_architecture

    # Check current Go status
    check_go_installed
    local go_status=$?

    if [[ $go_status -eq 0 ]]; then
        # Go is installed and meets requirements
        log "Go installation is up to date"
    else
        # Install/upgrade Go
        install_go_homebrew
    fi

    configure_go_env
    install_go_tools
    verify_go
    show_next_steps
}

main "$@"
