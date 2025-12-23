#!/bin/bash

################################################################################
# IntentR Setup Verification Script for macOS
################################################################################
# This script verifies that all components are properly installed and configured
#
# Usage:
#   ./5-verify-setup.sh
#
# Sequence: Run scripts in numerical order (Step 5 of 5)
#   1-install-dependencies.sh   (completed)
#   2-install-docker.sh         (completed)
#   3-install-golang.sh         (completed)
#   4-configure-environment.sh  (completed)
#   5-verify-setup.sh           <-- YOU ARE HERE (final step)
#
# Run this after completing all installation steps to verify everything is ready
################################################################################

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

total_checks=0
passed_checks=0
failed_checks=0
warning_checks=0

log() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

pass() {
    echo -e "  ${GREEN}✓${NC} $1"
    passed_checks=$((passed_checks + 1))
    total_checks=$((total_checks + 1))
}

fail() {
    echo -e "  ${RED}✗${NC} $1"
    failed_checks=$((failed_checks + 1))
    total_checks=$((total_checks + 1))
}

warning() {
    echo -e "  ${YELLOW}⚠${NC} $1"
    warning_checks=$((warning_checks + 1))
    total_checks=$((total_checks + 1))
}

# Check if a command exists
check_command() {
    local cmd=$1
    local name=$2
    local required=${3:-true}

    if command -v "$cmd" &> /dev/null; then
        local version=$($cmd --version 2>&1 | head -n 1)
        pass "$name: $version"
        return 0
    else
        if [ "$required" = true ]; then
            fail "$name is not installed (required)"
            return 1
        else
            warning "$name is not installed (optional)"
            return 2
        fi
    fi
}

# Check macOS version
check_macos() {
    log "Checking macOS..."

    if [[ "$(uname)" == "Darwin" ]]; then
        local macos_version=$(sw_vers -productVersion)
        local macos_major=$(echo "$macos_version" | cut -d. -f1)

        if [[ "$macos_major" -ge 11 ]]; then
            pass "macOS version: $macos_version"
        else
            warning "macOS version $macos_version may have compatibility issues (11+ recommended)"
        fi

        # Check architecture
        local arch=$(uname -m)
        pass "Architecture: $arch"
    else
        fail "Not running on macOS"
    fi
}

# Check Homebrew
check_homebrew() {
    log "Checking Homebrew..."

    if command -v brew &> /dev/null; then
        pass "Homebrew: $(brew --version | head -1)"
    else
        fail "Homebrew is not installed"
        info "Install with: /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
    fi
}

# Check Docker
check_docker() {
    log "Checking Docker..."

    if command -v docker &> /dev/null; then
        pass "Docker CLI: $(docker --version)"

        # Check if Docker daemon is running
        if docker info &> /dev/null; then
            pass "Docker daemon is running"

            # Check Docker Compose
            if docker compose version &> /dev/null; then
                pass "Docker Compose: $(docker compose version --short)"
            else
                fail "Docker Compose not available"
            fi
        else
            fail "Docker daemon is not running"
            info "Please start Docker Desktop from Applications"
        fi
    else
        fail "Docker is not installed"
    fi
}

# Check Go
check_go() {
    log "Checking Go..."

    if command -v go &> /dev/null; then
        local go_version=$(go version | awk '{print $3}')
        pass "Go: $go_version"

        # Check GOPATH
        local gopath=$(go env GOPATH)
        if [[ -n "$gopath" ]]; then
            pass "GOPATH: $gopath"
        else
            warning "GOPATH is not set"
        fi

        # Check minimum version (1.24+)
        local major=$(echo "$go_version" | sed 's/go//' | cut -d. -f1)
        local minor=$(echo "$go_version" | sed 's/go//' | cut -d. -f2)
        if [[ "$major" -ge 1 ]] && [[ "$minor" -ge 24 ]]; then
            pass "Go version meets requirements (>= 1.24)"
        else
            warning "Go version should be 1.24 or higher for this project"
        fi
    else
        fail "Go is not installed"
    fi
}

# Check Node.js
check_node() {
    log "Checking Node.js..."

    if command -v node &> /dev/null; then
        pass "Node.js: $(node --version)"
    else
        fail "Node.js is not installed"
    fi

    if command -v npm &> /dev/null; then
        pass "npm: $(npm --version)"
    else
        fail "npm is not installed"
    fi
}

# Check environment file
check_env_file() {
    log "Checking environment configuration..."

    if [ -f "$PROJECT_ROOT/.env" ]; then
        pass "Environment file exists (.env)"

        # Check critical environment variables
        source "$PROJECT_ROOT/.env" 2>/dev/null || true

        if [[ -n "$FIGMA_TOKEN" ]] && [[ "$FIGMA_TOKEN" != "your_figma_personal_access_token_here" ]]; then
            pass "FIGMA_TOKEN is configured"
        else
            warning "FIGMA_TOKEN is not configured (Figma features will not work)"
        fi

        if [[ -n "$ANTHROPIC_API_KEY" ]] && [[ "$ANTHROPIC_API_KEY" != "your_anthropic_api_key_here" ]]; then
            pass "ANTHROPIC_API_KEY is configured"
        else
            warning "ANTHROPIC_API_KEY is not configured (AI features will not work)"
        fi

        if [[ -n "$JWT_SECRET" ]]; then
            pass "JWT_SECRET is configured"
        else
            warning "JWT_SECRET is not configured"
        fi
    else
        warning "Environment file (.env) not found"
        info "Run: ./4-configure-environment.sh to create it"
    fi
}

# Check project files
check_project_files() {
    log "Checking project structure..."

    cd "$PROJECT_ROOT"

    local required_files=(
        "docker-compose.yml"
        "Makefile"
        "go.mod"
        "start.sh"
        "stop.sh"
    )

    local missing_files=()

    for file in "${required_files[@]}"; do
        if [ -f "$PROJECT_ROOT/$file" ]; then
            pass "Found: $file"
        else
            fail "Missing: $file"
            missing_files+=("$file")
        fi
    done
}

# Check service directories
check_services() {
    log "Checking service directories..."

    cd "$PROJECT_ROOT"

    local services=("integration-service" "design-service" "capability-service" "auth-service")
    local missing_services=()

    for service in "${services[@]}"; do
        if [ -d "cmd/$service" ]; then
            pass "Service directory: cmd/$service"
        else
            fail "Missing service: cmd/$service"
            missing_services+=("$service")
        fi
    done

    # Check web-ui
    if [ -d "web-ui" ]; then
        pass "Web UI directory: web-ui/"

        if [ -f "web-ui/package.json" ]; then
            pass "Web UI package.json exists"
        else
            warning "Web UI package.json not found"
        fi

        if [ -d "web-ui/node_modules" ]; then
            pass "Web UI dependencies installed"
        else
            warning "Web UI dependencies not installed (run: npm install in web-ui/)"
        fi
    else
        warning "Web UI directory not found"
    fi
}

# Check Go modules
check_go_modules() {
    log "Checking Go modules..."

    cd "$PROJECT_ROOT"

    if [ -f "go.mod" ]; then
        if [ -f "go.sum" ]; then
            pass "Go modules initialized (go.mod + go.sum)"
        else
            warning "go.sum not found (run: go mod tidy)"
        fi
    else
        fail "go.mod not found"
    fi
}

# Check ports
check_ports() {
    log "Checking port availability..."

    # Load ports from .env if available
    source "$PROJECT_ROOT/.env" 2>/dev/null || true

    local ports=(
        "${WEB_UI_PORT:-6173}:Web UI"
        "${INTEGRATION_SERVICE_PORT:-9080}:Integration Service"
        "${DESIGN_SERVICE_PORT:-9081}:Design Service"
        "${CAPABILITY_SERVICE_PORT:-9082}:Capability Service"
        "${AUTH_SERVICE_PORT:-9083}:Auth Service"
        "${POSTGRES_PORT:-6432}:PostgreSQL"
    )

    for port_info in "${ports[@]}"; do
        local port=$(echo "$port_info" | cut -d: -f1)
        local service=$(echo "$port_info" | cut -d: -f2)

        if lsof -i ":$port" &> /dev/null; then
            warning "Port $port ($service) is in use"
        else
            pass "Port $port ($service) is available"
        fi
    done
}

# Check network connectivity
check_network() {
    log "Checking network connectivity..."

    if ping -c 1 -t 2 8.8.8.8 &> /dev/null; then
        pass "Internet connectivity is available"
    else
        warning "No internet connectivity detected"
    fi
}

# Display summary
display_summary() {
    echo ""
    log "=================================================="
    log "  Verification Summary"
    log "=================================================="
    echo ""
    echo -e "Total checks:    $total_checks"
    echo -e "${GREEN}Passed:${NC}          $passed_checks"
    echo -e "${YELLOW}Warnings:${NC}        $warning_checks"
    echo -e "${RED}Failed:${NC}          $failed_checks"
    echo ""

    if [ $failed_checks -eq 0 ]; then
        if [ $warning_checks -eq 0 ]; then
            log "All checks passed! Your environment is ready."
        else
            warn "Setup is mostly complete, but there are some warnings to address."
        fi
        return 0
    else
        error "Setup verification found $failed_checks issue(s). Please address them above."
        return 1
    fi
}

# Display next steps
display_next_steps() {
    echo ""
    info "Next steps:"
    echo ""

    if [ ! -f "$PROJECT_ROOT/.env" ]; then
        echo "  1. Configure environment:"
        echo "     ./4-configure-environment.sh"
        echo ""
    fi

    echo "  2. Install web UI dependencies (if not done):"
    echo "     cd $PROJECT_ROOT/web-ui && npm install"
    echo ""

    echo "  3. Start all services:"
    echo "     cd $PROJECT_ROOT"
    echo "     ./start.sh"
    echo ""

    echo "  4. Or use Docker Compose:"
    echo "     make docker-build"
    echo "     make docker-up"
    echo ""

    echo "  5. Check service health:"
    echo "     ./scripts/setup/OSX/manage-services.sh health"
    echo ""
}

################################################################################
# Main Execution
################################################################################

main() {
    echo ""
    log "Starting IntentR setup verification for macOS..."
    echo ""

    check_macos
    echo ""

    check_homebrew
    echo ""

    check_docker
    echo ""

    check_go
    echo ""

    check_node
    echo ""

    check_env_file
    echo ""

    check_project_files
    echo ""

    check_services
    echo ""

    check_go_modules
    echo ""

    check_ports
    echo ""

    check_network
    echo ""

    display_summary
    local result=$?

    display_next_steps

    exit $result
}

main "$@"
